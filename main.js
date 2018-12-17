const fs = require("fs");
const { inspect } = require("util");
const Imap = require("imap");
require("dotenv").config();

const { EMAIL, PASSWORD } = process.env;

const imap = new Imap({
  user: EMAIL,
  password: PASSWORD,
  host: "imap.gmail.com",
  port: 993,
  tls: true
});

imap.once("ready", () => {
  imap.openBox("INBOX", true, (err, box) => {
    if (err) {
      throw err;
    }
    const f = imap.seq.fetch("1:3", { bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)", "TEXT"], struct: true });
    f.on("message", (msg, seqno) => {
      console.log("Message %d", seqno);
      const prefix = `(#${seqno}) `;
      msg.on("body", (stream, info) => {
        if (info.which === "TEXT") {
          console.log(`${prefix}Body [%s] found, %d total bytes`, inspect(info.which), info.size);
        }
        let count = 0;
        let buffer = "";
        stream.on("data", chunk => {
          count += chunk.length;
          buffer += chunk.toString("utf8");

          if (info.which === "TEXT") {
            console.log(`${prefix}Body [%s] (%d/%d)`, inspect(info.which), count, info.size);
          }
        });
        stream.once("end", () => {
          if (info.which !== "TEXT") {
            console.log(`${prefix}Parsed header: %s`, inspect(Imap.parseHeader(buffer)));
          } else {
            console.log(`${prefix}Body [%s] Finished`, inspect(info.which));
            console.log(buffer);
          }
        });
      });
      msg.once("attributes", attrs => {
        console.log(`${prefix}Attributes: %s`, inspect(attrs, false, 8));
      });
      msg.once("end", () => {
        console.log(`${prefix}Finished`);
      });
    });
    f.once("error", error => {
      console.log(`Fetch error: ${error}`);
    });
    f.once("end", () => {
      console.log("Done fetching all messages.");
      imap.end();
    });
  });
});

imap.once("error", err => {
  console.log(err);
});

imap.once("end", () => {
  console.log("Connection ended");
});

imap.connect();
