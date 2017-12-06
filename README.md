# Persistence Bundle for Botyo
[![npm](https://img.shields.io/npm/v/botyo-bundle-persistence.svg)](https://www.npmjs.com/package/botyo-bundle-persistence)
[![npm](https://img.shields.io/npm/dt/botyo-bundle-persistence.svg)](https://www.npmjs.com/package/botyo-bundle-persistence)
[![npm](https://img.shields.io/npm/l/botyo-bundle-persistence.svg)]()

The **Persistence Bundle for [Botyo](https://github.com/ivkos/botyo)** consists of a few components related to the persistence of messages in a MongoDB database.

The included components are:
- `MongoDbConnector` - An `AsyncResolvable` that connects to a MongoDB server during the initialization of **Botyo** and provides access to the database via the `Db` object provided by the [MongoDB Node.JS Driver](https://mongodb.github.io/node-mongodb-native/).
- `MessageDownloaderFilter` - Filter that saves each incoming message to the database.
- `ChatThreadHistoryDownloaderScheduledTask` - Scheduled task that downloads the history of all chat threads **Botyo** is configured to listen to and saves it to database.

## Install
**Step 1.** Install the module from npm.

`npm install --save botyo-bundle-persistence`

**Step 2.** Configure the MongoDB connection.

Add the [Connection String URL](https://docs.mongodb.com/manual/reference/connection-string/) to your configuration file `config.yaml`:
```yaml
facebook:
  email: ...
  password: ...
  ...


# Persistence Bundle Configuration
mongo:
  url: mongodb://localhost:27017/botyo

  
modules:
  ...
```

**Step 3.** Register the bundle.
```typescript
import Botyo from "botyo";
import { PersistenceBundle } from "botyo-bundle-persistence"

Botyo.builder()
    ...
    .registerBundle(PersistenceBundle)
    ...
    .build()
    .start();
```

## Configuration
The configuration of the included modules has sensible defaults. However, you can still override the defaults if you need to.

#### MessageDownloaderFilter
```yaml
modules:
    MessageDownloaderFilter:
      enable: true  # enables the filter globally
      
chat-threads:
    SOME_CHAT_THREAD_ID:
      overrides:
        modules.MessageDownloaderFilter:
          enable: false     # disables the filter for this chat thread
      participants:
        SOME_PARTICIPANT_ID:
          overrides:
            modules.MessageDownloaderFilter:
              enable: true  # enables the filter for this participant of this chat thread
```

#### ChatThreadHistoryDownloaderScheduledTask
```yaml
modules:
    ChatThreadHistoryDownloaderScheduledTask:
      enable: true          # enables the task
      schedule: 10800000    # milliseconds, how often to run; also accepts cron strings
      executeOnStart: true  # execute on start of Botyo
```