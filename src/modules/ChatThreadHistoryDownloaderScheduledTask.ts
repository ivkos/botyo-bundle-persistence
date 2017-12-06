import { ChatApi, ChatThreadUtils, FacebookId, Message, MongoDb, ScheduledTaskModule } from "botyo-api";
import { inject } from "inversify";
import { Collection, Db } from "mongodb";
import { LoggerInstance } from "winston";
import * as async from "async";

export class ChatThreadHistoryDownloaderScheduledTask extends ScheduledTaskModule
{
    private static readonly UNIQUE_INDEX_MESSAGE_ID = "messageID";

    private readonly logger: LoggerInstance;
    private readonly chatApi: ChatApi;
    private readonly chatThreadUtils: ChatThreadUtils;
    private readonly maxMessagesPerRequest: number;

    constructor(@inject(MongoDb) private readonly db: Db)
    {
        super();

        const runtime = this.getRuntime();

        this.logger = runtime.getLogger();
        this.chatApi = runtime.getChatApi();
        this.chatThreadUtils = runtime.getChatThreadUtils();

        this.maxMessagesPerRequest = runtime.getConfiguration().getOrElse<number>("maxMessagesPerRequest", 500);
    }

    async execute(): Promise<void>
    {
        const threadIds: FacebookId[] = this.chatThreadUtils.getChatThreadIds();

        const promises = threadIds.map(threadId => this.downloadMessagesByThreadId(threadId)
            .catch(err => {
                this.logger.error(`Chat thread '${threadId}': History download failed`, err);
            }));

        return Promise.all(promises).then(() => {});
    }

    getSchedule(): string | number
    {
        return this.getRuntime()
            .getConfiguration()
            .getOrElse(ScheduledTaskModule.CONFIG_KEY_SCHEDULE, 3 * 60 * 60 * 1000);
    }

    shouldExecuteOnStart(): boolean
    {
        return this.getRuntime()
            .getConfiguration()
            .getOrElse(ScheduledTaskModule.CONFIG_KEY_EXECUTE_ON_START, true);
    }

    private async downloadMessagesByThreadId(threadId: FacebookId)
    {
        const dbCollection = await this.db.createCollection(`thread-${threadId}`);

        const dbCountPromise = dbCollection.count({});
        const fbCountPromise = this.chatApi.getThreadInfo(threadId).then(info => info.messageCount);

        const fbCount = await fbCountPromise;
        if (fbCount === undefined) {
            throw new Error("fbCount is undefined");
        }

        const msgCount = this.handleMessageCount(await dbCountPromise, fbCount, threadId);
        if (msgCount === 0) return;

        await this.createUniqueIndexIfNotExists(dbCollection);

        return this.batchDownloadMessages(msgCount, threadId, dbCollection);
    }

    private async batchDownloadMessages(messageCount: number, threadId: FacebookId, dbCollection: Collection): Promise<void>
    {
        const msgsPerRequest = Math.min(messageCount, this.maxMessagesPerRequest);

        let i = 0;
        let lastTimestamp = Date.now();
        let downloadedMessageCount = 0;

        return new Promise<void>((resolve, reject) => {
            async.until(
                () => (i * msgsPerRequest) >= messageCount,

                done => {
                    return this.chatApi
                        .getThreadHistory(threadId, msgsPerRequest, lastTimestamp)
                        .then(messages => {
                            if (messages.length === 0) {
                                i++;
                                return;
                            }

                            downloadedMessageCount += messages.length;
                            lastTimestamp = messages[0].timestamp - 1;
                            i++;

                            return this.upsertMany(dbCollection, messages)
                                .then(({ upsertedCount }) => {
                                    this.logger.verbose(
                                        `Chat thread ${threadId}: ` +
                                        `Downloaded total ${downloadedMessageCount}/${messageCount} messages ` +
                                        `(${upsertedCount} new)`
                                    );
                                });
                        })
                        .then(() => done())
                        .catch(err => done(err));
                },

                err => {
                    if (err) return reject(err);
                    return resolve();
                });
        });
    }

    private handleMessageCount(dbCount: number, fbCount: number, threadId: FacebookId): number
    {
        this.logger.info(
            `Chat thread '${threadId}': ` +
            `There are ${dbCount} messages in cache, and ${fbCount} messages reported by Facebook`
        );

        if (dbCount == fbCount) {
            this.logger.info(`Chat thread '${threadId}': Message cache is up-to-date`);
            return 0;
        }

        if (dbCount > fbCount) {
            this.logger.warn(
                `Chat thread '${threadId}': ` +
                `There are more messages in the cache (${dbCount}) than Facebook reports (${fbCount}). ` +
                `Will download the whole chat history.`
            );

            return fbCount;
        }

        const diff = fbCount - dbCount;
        this.logger.info(`Chat thread '${threadId}': Message cache is ${diff} messages behind`);

        return diff;
    }


    private async createUniqueIndexIfNotExists(dbCollection: Collection)
    {
        const exists = await dbCollection.indexExists(ChatThreadHistoryDownloaderScheduledTask.UNIQUE_INDEX_MESSAGE_ID);
        if (exists) return;

        return dbCollection.createIndex(
            { [ChatThreadHistoryDownloaderScheduledTask.UNIQUE_INDEX_MESSAGE_ID]: 1 },
            { unique: true }
        );
    }

    private async upsertMany(dbCollection: Collection, messages: Message[])
    {
        const makeSingleResultFilterByMessageId = (msg: Message) => ({
            [ChatThreadHistoryDownloaderScheduledTask.UNIQUE_INDEX_MESSAGE_ID]:
                msg[ChatThreadHistoryDownloaderScheduledTask.UNIQUE_INDEX_MESSAGE_ID]
        });

        const operations = messages.map(msg => ({
            updateOne: {
                filter: makeSingleResultFilterByMessageId(msg),
                update: { $set: msg },
                upsert: true
            }
        }));

        return dbCollection.bulkWrite(operations, { ordered: false });
    }
}