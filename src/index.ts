import { Bundle } from "botyo-api";
import { MongoDbConnector } from "./persistence/MongoDbConnector";
import { MessageDownloaderFilter } from "./modules/MessageDownloaderFilter";
import { ChatThreadHistoryDownloaderScheduledTask } from "./modules/ChatThreadHistoryDownloaderScheduledTask";

export * from "./modules/ChatThreadHistoryDownloaderScheduledTask"
export * from "./modules/MessageDownloaderFilter"
export * from "./persistence/MongoDbConnector"

const BUNDLE = Bundle.of(
    [MessageDownloaderFilter, ChatThreadHistoryDownloaderScheduledTask],
    [MongoDbConnector]
);

export { BUNDLE as PersistenceBundle };