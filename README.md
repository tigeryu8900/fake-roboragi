# fake-roboragi

This is a crappy version of the Roboragi bot written in JavaScript.

Unlike Roboragi, this bot does not use a database and instead calls apis real-time.

To run the bot, first create a `.env` file in the project root directory like this:

```dotenv
REDDIT_USERNAME=fake-roboragi
REDDIT_PASSWORD=very-secure-password
```

Then, start the server:

```shell
npm start
```
