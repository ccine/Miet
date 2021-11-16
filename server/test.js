var Imap = require("imap"),
  inspect = require("util").inspect;
const simpleParser = require("mailparser").simpleParser;

var emailArray = new Array();
var imap = new Imap({
  user: "andrea.cinelli@studenti.univr.it",
  password: "(Tonta)31",
  host: "outlook.office365.com",
  port: 993,
  tls: true,
});

var map = [
  { total: 569, name: "INBOX" },
  { total: 343, name: "Posta eliminata" },
  { total: 50, name: "Calendario/Festività in Italia" },
  { total: 22, name: "Posta inviata" },
];

var query;

async function searchMail() {
  var boxmap = new Array();
  var countMail = 0;
  var countBox = 0;
  let emailArray = new Array();
  let len = 0;

  var req = {
    body: { subject: "12345678", year: 2021, box: ["INBOX", "Posta inviata"] },
  };

  var query = req.body.checkText
    ? [["OR", ["SUBJECT", req.body.subject], ["BODY", req.body.subject]]]
    : [["SUBJECT", req.body.subject]];
  if (req.body.email != undefined) {
    query.push([
      "OR",
      ["OR", ["FROM", req.body.email], ["TO", req.body.email]],
      ["CC", req.body.email],
    ]);
  }
  if (req.body.startDate != undefined) {
    query.push(["SINCE", req.body.startDate]);
  }
  if (req.body.endDate != undefined) {
    query.push(["BEFORE", req.body.endDate]);
  }

  var checkText = false;

  imap.once("ready", function () {
    let emailArray = new Array();
    let nMail = 0;
    imap.openBox(req.body.box[countBox], true, function aa(err) {
      if (err) console.log("errore open");
      imap.search(query, function (err, results) {
        if (err) console.log("errore search");
        let countMail = 0;

        if (results.length == 0) {
          return;
        }

        var f = imap.fetch(results, {
          bodies: "HEADER.FIELDS (FROM TO CC SUBJECT)",
        });
        console.log("Numero messaggi: " + results.length);

        f.on("message", function (msg) {
          msg.on("body", function (stream) {
            var buffer = "";
            stream.on("data", function (chunk) {
              buffer += chunk.toString("utf8");
            });
            stream.once("end", function () {
              console.log(inspect(Imap.parseHeader(buffer)));
            });
          });
        });
        f.once("error", function (err) {
          console.log("Fetch error: " + err);
        });
        f.once("end", function () {
          console.log("Done fetching all messages!");
          countBox++;
          if (countBox < req.body.box.length) {
            console.log("chiudi e apri");
            imap.closeBox((err) => {
              imap.openBox(req.body.box[countBox], true, (err) => {
                aa(err);
              });
            });
          } else {
            imap.end();
          }
        });
      });
    });
  });

  imap.once("error", function () {
    console.log("err");
  });

  imap.once("end", function () {
    console.log("Connection ended");
  });

  imap.connect();
  //setTimeout(function (){imap.end()}, 10000);
}

//searchMail();
test();

function recAddSubjects(array) {
  if (array == undefined || array.length < 1) {
    return;
  } else if (array.length == 1) {
    return ["SUBJECT", array[0]];
  }
  if (array.length == 2) {
    return ["OR", ["SUBJECT", array[0]], ["SUBJECT", array[1]]];
  }
  return ["OR", recAddSubjects(array.slice(1)), ["SUBJECT", array[0]]];
}

function countBoxes(boxes) {
  var len = Object.keys(boxes).length;
  for (let key in boxes) {
    if (boxes[key].children) {
      len = len + countBoxes(boxes[key].children);
    }
  }
  return len;
}

function parseEmailAddress(str) {
  let t = str.substring(str.indexOf("<") + 1, str.indexOf(">"));
  return t != "" ? t : "undisclosed-recipients";
}

function test() {
  var boxmap = new Array();
  var countMail = 0;
  var countBox = 0;
  let emailArray = new Array();
  let len = 0;

  var req = {
    body: {
      subject: "Sarabandaa",
      year: 2021,
      box: ["INBOX", "Posta Inviata"],
      checkText: true,
    },
  };

  var query = req.body.checkText
    ? [["OR", ["SUBJECT", req.body.subject], ["BODY", req.body.subject]]]
    : [["SUBJECT", req.body.subject]];
  if (req.body.email != undefined) {
    query.push([
      "OR",
      ["OR", ["FROM", req.body.email], ["TO", req.body.email]],
      ["CC", req.body.email],
    ]);
  }
  if (req.body.startDate != undefined) {
    query.push(["SINCE", req.body.startDate]);
  }
  if (req.body.endDate != undefined) {
    query.push(["BEFORE", req.body.endDate]);
  }

  // Funzione asincrona che cerca le mail una volta che è stabilita la connessione con il server Imap
  imap.once("ready", function () {
    imap.openBox(
      req.body.box ? req.body.box[countBox] : "INBOX",
      true,
      function aa(err) {
        if (err) throw err;

        imap.search(query, function (err, results) {
          if (err) throw err;

          let nMail = 0;
          let countMail = 0;

          if (results.length == 0) {
            countBox++;
            if (countBox < req.body.box.length) {
              imap.closeBox((err) => {
                imap.openBox(req.body.box[countBox], true, (err) => {
                  aa(err);
                });
              });
            } else {
              responseForClient = {
                status: 1,
                nMail: nMail,
                results: emailArray,
                subject: req.body.subject,
              };
              console.log(
                "Risposta al client: " + JSON.stringify(responseForClient)
              );
              responseForClient = undefined;
              imap.end();
            }
            return;
          }

          var f = imap.fetch(results, {
            bodies: "HEADER.FIELDS (FROM TO CC SUBJECT)",
          });
          console.log("Numero messaggi: " + results.length);

          f.on("message", function (msg) {
            msg.on("body", async function (stream) {
              simpleParser(stream, (err, mail) => {
                if (err) throw err;
                if (
                  req.body.checkText ||
                  mail.subject
                    .toString()
                    .toLowerCase()
                    .includes(req.body.subject.toLowerCase())
                ) {
                  nMail++;
                  // Conta le mail FROM in Imap.parseHeader(buffer).from
                  if (mail.from) {
                    mail.from.value.forEach((currentValue) => {
                      if (
                        req.body.email == undefined ||
                        req.body.email == currentValue.address
                      ) {
                        var find = emailArray.find(
                          (s) => s.mail == currentValue.address
                        );
                        if (find == undefined) {
                          find = {
                            mail: currentValue.address,
                            from: 0,
                            to: 0,
                            cc: 0,
                          };
                          emailArray.push(find);
                        }
                        find.from++;
                      }
                    });
                  }

                  // Conta le mail TO in Imap.parseHeader(buffer).to
                  if (mail.to) {
                    mail.to.value.forEach((currentValue) => {
                      if (
                        req.body.email == undefined ||
                        req.body.email == currentValue.address
                      ) {
                        var find = emailArray.find(
                          (s) => s.mail == currentValue.address
                        );
                        if (find == undefined) {
                          find = {
                            mail: currentValue.address,
                            from: 0,
                            to: 0,
                            cc: 0,
                          };
                          emailArray.push(find);
                        }
                        find.to++;
                      }
                    });
                  }

                  // Conta le mail CC in Imap.parseHeader(buffer).cc
                  if (mail.cc) {
                    mail.cc.value.forEach((currentValue) => {
                      if (
                        req.body.email == undefined ||
                        req.body.email == currentValue.address
                      ) {
                        var find = emailArray.find(
                          (s) => s.mail == currentValue.address
                        );
                        if (find == undefined) {
                          find = {
                            mail: currentValue.address,
                            from: 0,
                            to: 0,
                            cc: 0,
                          };
                          emailArray.push(find);
                        }
                        find.cc++;
                      }
                    });
                  }
                }
                countMail++;
                if (countMail >= results.length) {
                  countBox++;
                  if (countBox < req.body.box.length) {
                    imap.closeBox((err) => {
                      imap.openBox(req.body.box[countBox], true, (err) => {
                        aa(err);
                      });
                    });
                  } else {
                    responseForClient = {
                      status: 1,
                      nMail: nMail,
                      results: emailArray,
                      subject: req.body.subject,
                    };
                    console.log(
                      "Risposta al client: " + JSON.stringify(responseForClient)
                    );
                    responseForClient = undefined;
                    imap.end();
                  }
                }
              });
            });
          });

          f.once("error", function (err) {
            console.log("Fetch error: " + err);
            res.json(JSON.stringify({ status: -1, error: err }));
          });
        });
      }
    );
  });

  imap.once("error", function (err) {
    console.log(err);
    res.json(JSON.stringify({ status: -1, error: err }));
  });

  // Mi collego al server e effettuo la ricerca in base alla query creata
  imap.connect();
}

function parseEmailAddress(str) {
  let t = str.substring(str.indexOf("<") + 1, str.indexOf(">"));
  return t != "" ? t : "undisclosed-recipients";
}