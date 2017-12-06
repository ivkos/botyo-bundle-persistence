import { FilterModule, Message, MongoDb } from "botyo-api";
import { Db } from "mongodb";
import { inject } from "inversify";

export class MessageDownloaderFilter extends FilterModule
{
    constructor(@inject(MongoDb) private readonly db: Db)
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