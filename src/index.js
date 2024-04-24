/*
    Authors: Ben Yoo, Alan Yang, Yigit Duzenlioglu
    Date: Last Updated 4/17/2024
    Description: Main code for backend of the Discord Assistant Bot
    Work on this file:
      - Ben: Bot client connection, Stackoverflow search, Reddit search, Programming question search
      - Alan: Book recommendation search, Booksrun search, Google books search
      - Yigit: Pomodoro timer, Book recommendation search, Programming question search
*/

require("dotenv").config();

const { Client, IntentsBitField } = require("discord.js");
const fetch = require("node-fetch");
const pomodoroTimers = new Map();
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const BOOKSRUN_API_KEY = process.env.BOOKSRUN_API_KEY;

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

// bot online log
client.on("ready", (c) => {
  console.log(`${c.user.tag} is online!`);
});

// hello world test
client.on("messageCreate", (msg) => {
  if (msg.author.bot) {
    return;
  }
  if (msg.content === "hello world") {
    msg.reply("hello world");
  }
  //console.log(msg.content);
});

client.on("interactionCreate", async (interaction) => {
  // prevent self-loops
  if (!interaction.isChatInputCommand()) return;

  // ╔════════════════════════════════════════════════════════════╗
  // ║                        Hello Reply                         ║
  // ╚════════════════════════════════════════════════════════════╝

  if (interaction.commandName === "hello") {
    interaction.reply("hello!");
  }

  // ╔════════════════════════════════════════════════════════════╗
  // ║                        Client Ping                         ║
  // ╚════════════════════════════════════════════════════════════╝

  if (interaction.commandName === "ping") {
    await interaction.deferReply();
    const reply = await interaction.fetchReply();
    const ping = reply.createdTimestamp - interaction.createdTimestamp;
    interaction.editReply(`Client ${ping}ms`);
  }

  // ╔════════════════════════════════════════════════════════════╗
  // ║                    Stackoverflow Search                    ║
  // ╚════════════════════════════════════════════════════════════╝

  if (interaction.commandName === "stackoverflow") {
    const question = interaction.options.get("question").value;
    let title = "",
      keyword = "",
      accepted = "";
    if (interaction.options.get("title") !== null) {
      title = interaction.options.get("title").value;
    }
    if (interaction.options.get("keyword") !== null) {
      keyword = interaction.options.get("keyword").value;
    }
    if (interaction.options.get("accepted") !== null) {
      accepted = interaction.options.get("accepted").value;
    }

    try {
      await interaction.deferReply();
      
      console.log("Fetching question from stackoverflow...");
      //default call with question
      let apiCall =
        "https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=" +
        encodeURIComponent(question);

      // reduces search for only accepted answers if wanted
      if (accepted.toLowerCase() === "y" || accepted.toLowerCase() === "yes") {
        apiCall += "&accepted=True";
      }

      // only threads with at least one answer
      apiCall += "&answers=1";

      // if looking for a certain keyword in the body
      if (keyword !== "") {
        apiCall += "&body=" + encodeURIComponent(keyword);
      }

      // if the title must contain a keyword
      if (title !== "") {
        apiCall += "&title=" + encodeURIComponent(title);
      }

      apiCall += "&site=stackoverflow";

      const response = await fetch(apiCall);
      const data = await response.json();
      console.log("Fetched response successfully!");
      // console.log(response);

      // interaction.reply(response);

      if (data.items && data.items.length > 0) {
        let reply = "**Your question**: " + question + "\n";
        if (
          accepted.toLowerCase() === "y" ||
          accepted.toLowerCase() === "yes"
        ) {
          reply += "Only searching for accepted answers...\n";
        }
        if (title !== "") {
          reply += "With title including: " + title + "\n";
        }
        if (keyword !== "") {
          reply += "With body including: " + keyword + "\n";
        }
        for (let i = 0; i < Math.min(data.items.length, 3); ++i) {
          const myResult = data.items[i];
          const myTitle = myResult.title;
          const myLink = myResult.link;
          reply += `**Title:** ${myTitle}\n**Link:** ${myLink}\n\n`;
        }

        // Check if the reply exceeds the character limit
        if (reply.length > 2000) {
          await interaction.editReply(reply.substring(0, 2000));
          // Send remaining parts as follow-ups if the reply is too long
          for (let i = 2000; i < reply.length; i += 2000) {
            await interaction.followUp(
              reply.substring(i, Math.min(i + 2000, reply.length))
            );
          }
        } else {
          await interaction.editReply(reply);
        }
      } else {
        await interaction.reply("No results found :(");
      }
    } catch (error) {
      console.log(`There was an error: ${error}`);
      await interaction.reply("There was an error processing your request");
    }
  }

  // ╔════════════════════════════════════════════════════════════╗
  // ║                          Pomodoro                          ║
  // ╚════════════════════════════════════════════════════════════╝

  if (interaction.commandName === "pomodoro") {
    const studyDuration = interaction.options.getInteger("study") || 25; // in minutes
    const breakDuration = interaction.options.getInteger("break") || 5; // in minutes
    const cycles = interaction.options.getInteger("cycles") || 4;

    await interaction.reply(
      `Starting Pomodoro timer: ${studyDuration} minutes of study, ${breakDuration} minutes of break, for ${cycles} cycles.`
    );

    let currentCycle = 1;
    let isStudyPeriod = true;
    let startTime = Date.now();

    const timerId = setInterval(async () => {
      const elapsedTime = (Date.now() - startTime) / 60000; // convert milliseconds to minutes
      if (isStudyPeriod && elapsedTime >= studyDuration) {
        try {
          await interaction.followUp(
            `Cycle ${currentCycle}: Time for a break! ${breakDuration} minutes.`
          );
        } catch (error) {
          clearInterval(timerId);
          pomodoroTimers.delete(interaction.user.id);
          console.error("Error sending follow-up message:", error);
          await interaction.reply("There was an error");
        }
        isStudyPeriod = false;
        startTime = Date.now();
      } else if (!isStudyPeriod && elapsedTime >= breakDuration) {
        currentCycle++;
        if (currentCycle > cycles) {
          clearInterval(timerId);
          pomodoroTimers.delete(interaction.user.id);
          interaction.followUp("Pomodoro session complete!");
        } else {
          try {
            await interaction.followUp(
              `Cycle ${currentCycle}: Time to study! ${studyDuration} minutes.`
            );
          } catch (error) {
            clearInterval(timerId);
            pomodoroTimers.delete(interaction.user.id);
            console.error("Error sending follow-up message:", error);
            await interaction.reply("There was an error");
          }
          isStudyPeriod = true;
          startTime = Date.now();
        }
      }
    }, 60000); // check every minute

    pomodoroTimers.set(interaction.user.id, timerId);
  }

  // ╔════════════════════════════════════════════════════════════╗
  // ║                        Reddit Search                       ║
  // ╚════════════════════════════════════════════════════════════╝

  if (interaction.commandName === "reddit") {
    const question = interaction.options.get("question").value;
    const subreddit = interaction.options.get("subreddit").value;

    try {
      console.log("Fetching posts from Reddit...");
      //default call with question
      let apiCall = `https://www.reddit.com/r/${encodeURIComponent(
        subreddit
      )}/search.json?q=${encodeURIComponent(question)}&restrict_sr=on&limit=3`;

      let response = await fetch(apiCall, {
        // reddit api requires unique user agent
        headers: {
          "User-Agent": "Assistant (by /u/ybeanos)",
        },
      });

      let data = await response.json();
      console.log("Fetched response successfully!");

      // console.log(data);

      if (data.data && data.data.children.length > 0) {
        let reply = `**Your question on r/${subreddit}:** ${question}\n`;

        for (let result of data.data.children) {
          const myResult = result.data;
          const myTitle = myResult.title;
          const myLink = `https://www.reddit.com${myResult.permalink}`;
          reply += `**Title:** ${myTitle}\n**Link:** ${myLink}\n`;

          // Fetch top comments from each of the threads
          const commentsUrl = `https://www.reddit.com${myResult.permalink}.json?limit=5`;
          response = await fetch(commentsUrl, {
            headers: {
              "User-Agent": "Assistant (by /u/ybeanos)",
            },
          });
          const commentsData = await response.json();
          const comments = commentsData[1].data.children
            .map((child) => child.data.body)
            .slice(0, 3);

          if (comments.length > 0) {
            reply += `**Top Comments:**\n`;
            comments.forEach((comment, index) => {
              reply += `${index + 1}. ${comment}\n`;
            });
          } else {
            reply += `**No comments found.**\n`;
          }

          reply += `\n`;
        }

        // Check if the reply exceeds the character limit
        if (reply.length > 2000) {
          // Split the reply into multiple messages
          const chunkSize = 2000;
          for (let i = 0; i < reply.length; i += chunkSize) {
            const chunk = reply.substring(i, i + chunkSize);
            await interaction.followUp(chunk);
          }
          return; // Return after sending all chunks
        } else {
          await interaction.reply(reply);
        }
      } else {
        await interaction.reply("No results found within subreddit :(");
      }
    } catch (error) {
      console.log(`There was an error: ${error}`);
      await interaction.reply("There was an error processing your request");
    }
  }

  // ╔════════════════════════════════════════════════════════════╗
  // ║                    Booksearch Search                       ║
  // ╚════════════════════════════════════════════════════════════╝

  async function searchBookPriceByISBN(isbn) {
    const apiKey = process.env.GOOGLE_API_KEY;
    const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(
      isbn
    )}&key=${apiKey}`;

    try {
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        return "No books found with the given ISBN.";
      }

      const book = data.items[0];
      const saleInfo = book.saleInfo;
      let reply = `**ISBN**: ${isbn}\n**Title**: ${book.volumeInfo.title}\n`;

      if (saleInfo.saleability === "FOR_SALE") {
        reply += `**List Price**: $${saleInfo.listPrice?.amount ?? "N/A"} ${
          saleInfo.listPrice?.currencyCode ?? ""
        }\n`;
        reply += `**Retail Price**: $${saleInfo.retailPrice?.amount ?? "N/A"} ${
          saleInfo.retailPrice?.currencyCode ?? ""
        }\n`;
        reply += saleInfo.buyLink
          ? `**Buy Link**: [Purchase Here](${saleInfo.buyLink})\n`
          : "";
      } else {
        reply += "**Price**: Not for sale\n";
      }

      // Display additional links if available
      reply += `**More Info**: [Here](${book.volumeInfo.infoLink})\n`;
      reply += `**Preview Link**: [Preview Here](${book.volumeInfo.previewLink})`;

      return reply;
    } catch (error) {
      console.error("Error fetching book prices:", error);
      return "Failed to retrieve book prices. Please check the ISBN and try again.";
    }
  }

  if (interaction.commandName === "googlebooks") {
    const isbn = interaction.options.getString("isbn");
    await interaction.deferReply();
    const bookDetails = await searchBookPriceByISBN(isbn);
    await interaction.editReply(bookDetails);
  }

  if (interaction.commandName === "booksrun") {
    const ISBN = interaction.options.get("isbn").value;

    try {
      // Immediately defer the reply
      await interaction.deferReply();

      let apiCall = `https://booksrun.com/api/v3/price/buy/${encodeURIComponent(
        ISBN
      )}?key=1j609wj6vyuuu0rzz85a`;
      const response = await fetch(apiCall);
      const data = await response.json();
      console.log("Fetched response successfully!");

      if (data.result.status === "success" && data.result.offers.booksrun) {
        const booksrunOffer = data.result.offers.booksrun;
        let reply = `**Prices for ISBN ${ISBN}:**\n`;

        // Format prices for new, used, rent, and ebook options
        const formatPriceDetails = (option, label) => {
          if (option && option !== "none") {
            if (typeof option === "object" && !option.price) {
              // If it's an object and does not directly contain a 'price' key, iterate over its keys
              Object.keys(option).forEach((key) => {
                const detail = option[key];
                reply += `  - **${label} ${key} days:** $${detail.price} [Buy/Rent](${detail.cart_url})\n`;
              });
            } else if (option.price) {
              // Direct price and cart_url available
              reply += `  - **${label}:** $${option.price} [Buy/Rent](${option.cart_url})\n`;
            }
          } else {
            reply += `  - **${label}:** Not available\n`;
          }
        };

        reply += "**New:**\n";
        formatPriceDetails(booksrunOffer.new, "New");

        reply += "**Used:**\n";
        formatPriceDetails(booksrunOffer.used, "Used");

        reply += "**Rent Options:**\n";
        formatPriceDetails(booksrunOffer.rent, "Rent");

        reply += "**Ebook Options:**\n";
        formatPriceDetails(booksrunOffer.ebook, "Ebook");

        // Sending the formatted reply
        await interaction.editReply(reply);
      } else {
        await interaction.editReply("No prices found for the given ISBN.");
      }
    } catch (error) {
      console.log(`There was an error: ${error}`);
      await interaction.editReply(
        "There was an error processing your request."
      );
    }
  }

  async function searchBookByISBN(isbn) {
    const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(
      isbn
    )}&key=${GOOGLE_API_KEY}`;
    const booksRunUrl = `https://booksrun.com/api/v3/price/buy/${encodeURIComponent(
      isbn
    )}?key=${BOOKSRUN_API_KEY}`;

    try {
      const [googleResponse, booksRunResponse] = await Promise.all([
        fetch(googleBooksUrl),
        fetch(booksRunUrl),
      ]);

      const googleData = await googleResponse.json();
      const booksRunData = await booksRunResponse.json();

      if (!googleData.items || googleData.items.length === 0) {
        return "No book found with the given ISBN.";
      }

      const title = googleData.items[0].volumeInfo.title;
      const titleSearchUrl = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(
        title
      )}&key=${GOOGLE_API_KEY}`;
      const titleResponse = await fetch(titleSearchUrl);
      const titleData = await titleResponse.json();

      let reply = `**ISBN**: ${isbn}\n**Title**: ${title}\n\n**Google Books Prices**\n`;
      let lowestPrice = Infinity;
      let lowestLink = "";

      // Check Google Books prices
      if (titleData.items && titleData.items.length > 0) {
        const exactMatches = titleData.items.filter(
          (item) => item.volumeInfo.title === title
        );
        exactMatches.forEach((item) => {
          const saleInfo = item.saleInfo;
          if (saleInfo.saleability === "FOR_SALE" && saleInfo.retailPrice) {
            const price = saleInfo.retailPrice.amount;
            if (price < lowestPrice) {
              lowestPrice = price;
              lowestLink = saleInfo.buyLink;
            }
            reply += saleInfo.isEbook
              ? "**(Ebook)**\n"
              : "**(Print edition)**\n";
            reply += `**Price**: $${price} ${saleInfo.retailPrice.currencyCode} `;
            reply += `[Purchase Here](${saleInfo.buyLink})\n`;
          } else {
            reply += "**Not for sale.**\n";
          }
        });
      }

      // Handle BooksRun data
      if (
        booksRunData.result.status === "success" &&
        booksRunData.result.offers.booksrun
      ) {
        const booksrunOffer = booksRunData.result.offers.booksrun;
        reply += "\n**BooksRun Prices**\n";
        ["new", "used", "rent", "ebook"].forEach((type) => {
          if (booksrunOffer[type] && booksrunOffer[type].price) {
            const price = booksrunOffer[type].price;
            if (price < lowestPrice) {
              lowestPrice = price;
              lowestLink = booksrunOffer[type].cart_url;
            }
            reply += `**${
              type.charAt(0).toUpperCase() + type.slice(1)
            }**: $${price} `;
            reply += `[Buy/Rent](${booksrunOffer[type].cart_url})\n`;
          }
        });
      }

      if (lowestPrice < Infinity) {
        reply += `\n**Our recommendation**: $${lowestPrice} [Buy Here](${lowestLink})`;
      } else {
        reply += "\nNo prices available for sale.";
      }

      return reply;
    } catch (error) {
      console.error("Error fetching book details:", error);
      return "Failed to retrieve book details. Please check the ISBN and try again.";
    }
  }

  // Command handling
  if (interaction.commandName === "booksearch") {
    const isbn = interaction.options.getString("isbn");
    await interaction.deferReply();
    const bookDetails = await searchBookByISBN(isbn);
    await interaction.editReply(bookDetails);
  }

  // ╔════════════════════════════════════════════════════════════╗
  // ║                    Programming Search                      ║
  // ╚════════════════════════════════════════════════════════════╝

  if (interaction.commandName === "psearch") {
    const question = interaction.options.get("question").value;

    try {
      // Immediately defer the reply to get time to fetch data
      await interaction.deferReply();

      // Fetching data from StackOverflow and Reddit
      let stackCall1 =
        "https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=" +
        encodeURIComponent(question) +
        "&answers=1&site=stackoverflow";
      const stackResponse1 = await fetch(stackCall1);
      const stackData1 = await stackResponse1.json();

      let stackCall2 =
        "https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=votes&q=" +
        encodeURIComponent(question) +
        "&accepted=True&answers=1&site=stackoverflow";
      const stackResponse2 = await fetch(stackCall2);
      const stackData2 = await stackResponse2.json();

      let programmingSubreddits = [
        "programming",
        "learnprogramming",
        "coding",
        "compsci",
        "cpp",
        "csharp",
        "devops",
        "frontend",
        "cscareerquestions",
        "gamedev",
        "java",
        "javascript",
        "linux",
        "machinelearning",
        "python",
      ];
      let subredditQuery = programmingSubreddits
        .map((sr) => `subreddit:${sr}`)
        .join(" OR ");

      let redditCall1 = `https://www.reddit.com/search.json?q=${encodeURIComponent(
        question + " (" + subredditQuery + ")"
      )}&restrict_sr=on&limit=1`;
      const redditResponse1 = await fetch(redditCall1, {
        headers: { "User-Agent": "Assistant (by /u/ybeanos)" },
      });
      const redditData1 = await redditResponse1.json();

      let redditCall2 = `https://www.reddit.com/search.json?q=${encodeURIComponent(
        question + " (" + subredditQuery + ")"
      )}&restrict_sr=on&sort=top&limit=10`;
      const redditResponse2 = await fetch(redditCall2, {
        headers: { "User-Agent": "Assistant (by /u/ybeanos)" },
      });
      const redditData2 = await redditResponse2.json();

      // Building the reply based on fetched data
      let reply = "**Your question**: " + question + "\n";

      // StackOverflow results
      if (stackData1.items && stackData1.items.length > 0) {
        const result = stackData1.items[0];
        reply += `**StackOverflow Relevance:** [${result.title}](${result.link})\n\n`;
      }
      if (
        stackData2.items &&
        stackData2.items.length > 0 &&
        stackData1.items[0].link != stackData2.items[0].link
      ) {
        const result = stackData2.items[0];
        reply += `**Top StackOverflow Votes:** [${result.title}](${result.link})\n\n`;
      }

      // Reddit results
      if (redditData1.data && redditData1.data.children.length > 0) {
        const result = redditData1.data.children[0].data;
        reply += `**Reddit Relevance:** [${result.title}](https://www.reddit.com${result.permalink})\n\n`;
      }
      if (redditData2.data && redditData2.data.children.length > 0) {
        const result = redditData2.data.children.find(
          (child) => child.data.score > 50 && child.data.num_comments > 5
        );
        if (
          result &&
          result.data.title != redditData1.data.children[0].data.title
        ) {
          reply += `**Top Reddit Post:** [${result.data.title}](https://www.reddit.com${result.data.permalink})\n\n`;
        }
      }

      // Sending the final response
      if (reply.length > 2000) {
        // Split the reply into multiple messages if too long
        await interaction.followUp({
          content: reply.substring(0, 2000),
          ephemeral: true,
        });
        for (let i = 2000; i < reply.length; i += 2000) {
          await interaction.followUp({
            content: reply.substring(i, i + 2000),
            ephemeral: true,
          });
        }
      } else {
        await interaction.editReply(reply);
      }
    } catch (error) {
      console.error(`Error in psearch command: ${error}`);
      await interaction.editReply(
        "There was an error processing your request."
      );
    }
  }
});

client.login(process.env.TOKEN);
