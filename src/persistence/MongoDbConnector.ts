import { ApplicationConfiguration, AsyncResolvable, AsyncResolvableServiceIdentifier, MongoDb } from "botyo-api";
import { Db, MongoClient } from "mongodb";
import { inject } from "inversify";

export class MongoDbConnector extends AsyncResolvable<Db>
{
    private readonly mongoUrl: string;

    constructor(@inject(ApplicationConfiguration.SYMBOL) private readonly appConfig: ApplicationConfiguration)
    {
        super();
        this.mongoUrl = appConfig.getProperty("mongo.url");
    }

    async resolve(): Promise<Db>
    {
        return await MongoClient.connect(this.mongoUrl);
    }

    getServiceIdentifier(): AsyncResolvableServiceIdentifier<Db>
    {
        return MongoDb;
    }
}