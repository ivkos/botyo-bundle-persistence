import { ApplicationConfiguration, AsyncResolvable, MongoDb, ServiceIdentifier } from "botyo-api";
import { Db, MongoClient } from "mongodb";
import { inject } from "inversify";

export class MongoDbConnector implements AsyncResolvable<Db>
{
    private readonly mongoUrl: string;

    constructor(@inject(ApplicationConfiguration.SYMBOL) private readonly appConfig: ApplicationConfiguration)
    {
        this.mongoUrl = appConfig.getProperty("mongo.url");
    }

    async resolve(): Promise<Db>
    {
        return await MongoClient.connect(this.mongoUrl);
    }

    getServiceIdentifier(): ServiceIdentifier<Db>
    {
        return MongoDb.SYMBOL;
    }
}