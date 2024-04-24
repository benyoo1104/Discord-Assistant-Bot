/*
    Authors: Ben Yoo, Alan Yang, Yigit Duzenlioglu
    Date: Last Updated 4/17/2024
    Description: Main code for backend of the Discord Assistant Bot
    Work on this file:
      - Ben: Hello reply, Client ping, Stackoverflow Search, Reddit search, Programming search, Registering the commands
      - Alan: Booksearch
      - Yigit: Pomodoro
*/

require("dotenv").config();

const { REST, Routes, ApplicationCommandOptionType } = require("discord.js");

const commands = [
  // ╔════════════════════════════════════════════════════════════╗
  // ║                        Hello Reply                         ║
  // ╚════════════════════════════════════════════════════════════╝
  {
    name: "hello",
    description: "Replies with hello",
  },

  // ╔════════════════════════════════════════════════════════════╗
  // ║                        Client Ping                         ║
  // ╚════════════════════════════════════════════════════════════╝
  {
    name: "ping",
    description: "Returns the client ping",
  },

  // ╔════════════════════════════════════════════════════════════╗
  // ║                    Stackoverflow Search                    ║
  // ╚════════════════════════════════════════════════════════════╝
  {
    name: "stackoverflow",
    description:
      "Searches for related answers on Stack Overflow given the question",
    options: [
      {
        name: "question",
        description: "question",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "title",
        description: "keyword that must be present in title",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
      {
        name: "keyword",
        description:
          "keyword that must be present in the main body of the question",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
      {
        name: "accepted",
        description:
          "if y or yes is entered, will only return questions with accepted answers",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
  },

  // ╔════════════════════════════════════════════════════════════╗
  // ║                          Pomodoro                          ║
  // ╚════════════════════════════════════════════════════════════╝
  {
    name: "pomodoro",
    description: "Start a Pomodoro study session",
    options: [
      {
        name: "study",
        description: "Duration of study period in minutes (default: 25)",
        type: ApplicationCommandOptionType.Integer,
        required: false,
      },
      {
        name: "break",
        description: "Duration of break period in minutes (default: 5)",
        type: ApplicationCommandOptionType.Integer,
        required: false,
      },
      {
        name: "cycles",
        description: "Number of study-break cycles (default: 4)",
        type: ApplicationCommandOptionType.Integer,
        required: false,
      },
    ],
  },

  // ╔════════════════════════════════════════════════════════════╗
  // ║                        Reddit Search                       ║
  // ╚════════════════════════════════════════════════════════════╝
  {
    name: "reddit",
    description:
      "Searches for related answers on Reddit given the question and subreddit",
    options: [
      {
        name: "question",
        description: "question",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "subreddit",
        description: "subreddit to search within",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },

  // ╔════════════════════════════════════════════════════════════╗
  // ║                    Booksearch Search                       ║
  // ╚════════════════════════════════════════════════════════════╝
  {
    name: "booksrun",
    description: "Searches for textbook costs on booksrun given ISBN",
    options: [
      {
        name: "isbn",
        description: "The ISBN number of the book",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },

  {
    name: "googlebooks",
    description: "Searches for textbook costs on googlebooks given ISBN",
    options: [
      {
        name: "isbn",
        description: "ISBN",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },

  {
    name: "booksearch",
    description: "Searches for textbook costs given ISBN",
    options: [
      {
        name: "isbn",
        description: "ISBN",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },

  // ╔════════════════════════════════════════════════════════════╗
  // ║                    Programming Search                      ║
  // ╚════════════════════════════════════════════════════════════╝
  {
    name: "psearch",
    description: "Searches for the best programming answers given the question",
    options: [
      {
        name: "question",
        description: "question",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
];

// ╔════════════════════════════════════════════════════════════╗
// ║                  Registering the Commands                  ║
// ╚════════════════════════════════════════════════════════════╝
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("Registering slash commands...");

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log("Registered slash commands successfully!");
  } catch (error) {
    console.log(`There was an error: ${error}`);
  }
})();
