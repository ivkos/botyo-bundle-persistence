import { AbstractFilterModule, Message, MongoDb } from "botyo-api";
import { inject } from "inversify";

export class MessageDownloaderFilter extends AbstractFilterModule
{
    constructor(@inject(MongoDb.SYMBOL) private readonly db: MongoDb)
    {
        super();
    }

    async filter(msg: Message): Promise<Message | void>
    {
        const threadId = msg.threadID;

        this.db.collection(`thread-${threadId}`)
            .insertOne(msg)
            .catch(err => {
                this.getRuntime().getLogger().warn(`Error ${err.code} while writing message to db`, err);
            });

        return msg;
    }
}