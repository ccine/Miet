const express = require("express");                               // Libreria per la creazione di un server Http
const cors = require("cors");
var bodyParser = require("body-parser");                          // Libreria per il parsing del corpo delle richieste http
const simpleParser = require("mailparser").simpleParser;          // Libreria per il parsing delle mail
var Imap = require("imap"),                                       // Libreria per la connessione con il server Imap
  inspect = require("util").inspect;                              // Libreria per l'utilizzo del comando inspect per gli oggetti javascript

const app = express();
app.use(cors());
app.use(bodyParser.json());
const port = 32325;
const host = "localhost";

var responseForClient = new Object();
var boxmap = new Array();
var emailArray;
var countMail;
var countBox;
var totalMail;

var imap;

/* Funzione che riceve la richiesta di autenticazione di un utente, necessaria per impostare un utente valido con cui effettuare le connessioni al server Imap.
*  Restituisce tutte le cartelle non vuote presenti nella casella di posta dell'utente in ordine descrescente rispetto al numero di mail nella cartella.
*/
app.post("/login", (req, res) => {
  console.log("Received request on /login ");

  // Controlla che la richiesta abbia tutti i parametri necessari oppure risponde con un messaggio di errore
  if (
    req.body == undefined ||
    req.body.user == undefined ||
    req.body.pass == undefined
  ) {
    console.log("Bad request");
    res.json(JSON.stringify({ status: -2, error: "Bad request" }));
    return;
  }

  // Creo l'istanza di connessione al server Imap con mail e pw inviati nella richiesta
  imap = new Imap({
    user: req.body.user,
    password: req.body.pass,
    host: "outlook.office365.com",
    port: 993,
    tls: true,
    keepalive: true,
  });

  var len = 0;
  countBox = 0;
  boxmap = new Array();

  imap.once("ready", function () {
    // Ritorna tutte le cartelle presenti nella casella di posta
    imap.getBoxes(function more(err, boxes, path) {
      if (err) return;
      // Se non ho già calcolato, controllo il numero di cartelle presenti nella casella di posta
      len = len > 0 ? len : countBoxes(boxes);

      if (!path) path = "";
      for (var key in boxes) {
        if (boxes[key].children) {
          more(
            undefined,
            boxes[key].children,
            path + key + boxes[key].delimiter
          );
        }
        // Leggo le informazioni di ogni cartella per trovare il numero di mail che contiene
        imap.status(path + key, function (err, box) {
          // Aggiungo le cartelle non vuote ad un array indicando anche il numero di mail che contiene
          if (box.messages.total > 0) {
            boxmap.push({ total: box.messages.total, name: box.name });
          }
          countBox++;
          // Controllo di aver controllato tutte le caselle e in caso restituisco il nome (percorso) di tutte le cartelle non vuote in ordine descrescente rispetto
          // al numero di mail presenti in ogni cartella
          if (countBox == len) {
            boxmap.sort((a, b) => (a.total > b.total ? -1 : 1));
            console.log(boxmap);
            res.json(
              JSON.stringify({ status: 1, boxes: boxmap.map((a) => a.name) })
            );
          }
        });
      }
    });
  });

  imap.once("error", function (err) {
    console.log("LOGIN FAILED");
    imap = undefined;
    res.json(JSON.stringify({ status: -1, error: err }));
  });

  imap.once("end", function () {
    console.log("Connection with server mail ended");
  });

  // Mi collego al server e effettuo la ricerca in base alla query creata
  imap.connect();
});

// Richiesta custom permette di fare una ricerca per oggetto della mail, opzionali: indirizzo mail, data inizio e data fine, ricerca anche nel testo
app.post("/custom", (req, res) => {
  console.log("Received request on /custom: %s", inspect(req.body));

  // Controlla che la richiesta abbia tutti i parametri necessari oppure risponde con un messaggio di errore
  if (!req.body || !req.body.subject || !req.body.box || !imap) {
    res.json(JSON.stringify({ status: -2, error: "Bad request" }));
    return;
  }

  // Creo la query da mandare al Server Imap con tutti i campi che ho ricevuto
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

  // Funzione asincrona invocata quando è stabilita la connessione con il server Imap
  imap.once("ready", function () {
    countBox = 0;                   // Contatore per le box
    totalMail = 0;                  // Somma delle mail correttamente processate
    emailArray = new Array();       // Array che contiene il tutti gli indirizzi email con i relativi conteggi

    // Funzione che apre la prima cartella passata come attributo, la funzione moreOpen viene chiamata dopo che la cartella è stata aperta
    imap.openBox(req.body.box[0], true, function moreOpen(err) {
      if (err) throw err;

      imap.search(query, function (err, results) {
        if (err) throw err;

        countMail = 0;              // Contatore per le mail, si azzera quando si entra in una cartella diversa

        // Se la ricerca non ha prodotto risultati controllo di aver aperto tutte le cartelle, nel caso invio la risposta al client
        if (results.length == 0) {
          countBox++;
          if (countBox < req.body.box.length) {
            imap.closeBox((err) => {
              imap.openBox(req.body.box[countBox], true, (err) => {
                moreOpen(err);
              });
            });
          } else {
            if (totalMail == 0) {
              res.json(JSON.stringify({ status: 0, nMail: 0 }));
            } else {
              responseForClient = {
                status: 1,
                nMail: totalMail,
                results: emailArray,
                subject: req.body.subject,
              };
              if (req.body.startDate != undefined) {
                responseForClient.startDate = req.body.startDate;
              }
              if (req.body.endDate != undefined) {
                responseForClient.endDate = req.body.endDate;
              }

              console.log("Risposta al client: " + inspect(responseForClient));
              res.json(JSON.stringify(responseForClient));
              responseForClient = undefined;
            }
          }
          return;
        }

        // Effuettuo la scansione dei messaggi salvando i campi dell'header: from, to, cc, subject
        var f = imap.fetch(results, {
          bodies: "HEADER.FIELDS (FROM TO CC SUBJECT)",
        });
        
        // Per ogni messaggio utilizzo la funzione simpleParser per ottenere correttamente i campi richiesti 
        f.on("message", function (msg) {
          msg.on("body", async function (stream) {
            simpleParser(stream, (err, mail) => {
              if (err) throw err;
              // Nel caso in cui non sto effettuando una ricerca anche sul testo controllo che l'oggetto della contenga 
              // effettivamente la parola da cercare  
              if (
                req.body.checkText ||
                mail.subject
                  .toString()
                  .toLowerCase()
                  .includes(req.body.subject.toLowerCase())
              ) {
                totalMail++;

                // Per ogni indirizzo mail sorgente (se esiste) aggiunge il conteggio a emailArray
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

                // Per ogni indirizzo mail destinatario (se esiste) aggiunge il conteggio a emailArray
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

                // Per ogni indirizzo mail in copia (se esiste) aggiunge il conteggio a emailArray
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
              // Controlla di aver letto tutte le mail
              if (countMail >= results.length) {
                countBox++;
                // Se non ha aperto tutte le cartelle apre la prossima cartella nell'elenco box ricevuto nella richiesta
                // In caso contrario prepara la risposta al client
                if (countBox < req.body.box.length) {
                  imap.closeBox((err) => {
                    imap.openBox(req.body.box[countBox], true, (err) => {
                      moreOpen(err);
                    });
                  });
                } else {
                  if (totalMail == 0) {
                    res.json(JSON.stringify({ status: 0, nMail: 0 }));
                    return;
                  }
                  responseForClient = {
                    status: 1,
                    nMail: totalMail,
                    results: emailArray,
                    subject: req.body.subject,
                  };
                  if (req.body.startDate != undefined) {
                    responseForClient.startDate = req.body.startDate;
                  }
                  if (req.body.endDate != undefined) {
                    responseForClient.endDate = req.body.endDate;
                  }

                  console.log(
                    "Risposta al client: " + inspect(responseForClient)
                  );
                  res.json(JSON.stringify(responseForClient));
                  responseForClient = undefined;
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
    });
  });

  imap.once("error", function (err) {
    console.log(err);
    res.json(JSON.stringify({ status: -1, error: err }));
  });

  // Mi collego al server e effettuo la ricerca in base alla query creata
  imap.connect();
});

app.post("/annual", (req, res) => {
  console.log("Received request on /annual: %s", inspect(req.body));

  // Controlla che la richiesta abbia tutti i parametri necessari oppure risponde con un messaggio di errore
  if (!req.body || !req.body.subject || !req.body.year || !req.body.box || !imap) {
    res.json(JSON.stringify({ status: -2, error: "Bad request" }));
    return;
  }

  // Creo la query da mandare al Server Imap con tutti i campi che ho ricevuto
  var query = [
    ["SINCE", `${req.body.year}`],
    ["BEFORE", `${+req.body.year + 1}`],
  ];

  if (req.body.checkText) {
    query.push([
      "OR",
      ["SUBJECT", req.body.subject],
      ["BODY", req.body.subject],
    ]);
  } else {
    query.push(["SUBJECT", req.body.subject]);
  }

  if (req.body.email != undefined) {
    query.push([
      "OR",
      ["OR", ["FROM", req.body.email], ["TO", req.body.email]],
      ["CC", req.body.email],
    ]);
  }

  // Funzione asincrona che cerca le mail una volta che è stabilita la connessione con il server Imap
  imap.once("ready", function () {
    countBox = 0;
    totalMail = 0;
    emailArray = new Array();

    imap.openBox(req.body.box[0], true, function moreOpen(err) {
      if (err) throw err;

      imap.search(query, function (err, results) {
        if (err) throw err;

        countMail = 0;

        if (results.length == 0) {
          countBox++;
          if (countBox < req.body.box.length) {
            imap.closeBox((err) => {
              imap.openBox(req.body.box[countBox], true, (err) => {
                moreOpen(err);
              });
            });
          } else {
            responseForClient =
              totalMail == 0
                ? { status: 0, nMail: 0 }
                : {
                    status: 1,
                    nMail: totalMail,
                    results: emailArray,
                    subject: req.body.subject,
                    year: req.body.year,
                  };
            console.log("Risposta al client: " + inspect(responseForClient));
            res.json(JSON.stringify(responseForClient));
            responseForClient = undefined;
          }
          return;
        }

        var f = imap.fetch(results, {
          bodies: "HEADER.FIELDS (FROM TO CC DATE SUBJECT)",
        });
        //console.log("Numero messaggi: " + results.length);

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
                let month = "" + mail.date.getMonth();
                totalMail++;

                if (emailArray[month] == undefined) {
                  emailArray[month] = new Array();
                }

                // Conta le mail FROM in Imap.parseHeader(buffer).from
                if (mail.from) {
                  mail.from.value.forEach((currentValue) => {
                    if (
                      req.body.email == undefined ||
                      req.body.email == currentValue.address
                    ) {
                      var find = emailArray[month].find(
                        (s) => s.mail == currentValue.address
                      );
                      if (find == undefined) {
                        find = {
                          mail: currentValue.address,
                          from: 0,
                          to: 0,
                          cc: 0,
                        };
                        emailArray[month].push(find);
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
                      var find = emailArray[month].find(
                        (s) => s.mail == currentValue.address
                      );
                      if (find == undefined) {
                        find = {
                          mail: currentValue.address,
                          from: 0,
                          to: 0,
                          cc: 0,
                        };
                        emailArray[month].push(find);
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
                      var find = emailArray[month].find(
                        (s) => s.mail == currentValue.address
                      );
                      if (find == undefined) {
                        find = {
                          mail: currentValue.address,
                          from: 0,
                          to: 0,
                          cc: 0,
                        };
                        emailArray[month].push(find);
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
                      moreOpen(err);
                    });
                  });
                } else {
                  responseForClient =
                    totalMail == 0
                      ? { status: 0, nMail: 0 }
                      : {
                          status: 1,
                          nMail: totalMail,
                          results: emailArray,
                          subject: req.body.subject,
                          year: req.body.year,
                        };

                  console.log(
                    "Risposta al client: " + inspect(responseForClient)
                  );
                  res.json(JSON.stringify(responseForClient));
                  responseForClient = undefined;
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
    });
  });

  imap.once("error", function (err) {
    console.log(err);
    res.json(JSON.stringify({ status: -1, error: err }));
  });

  // Mi collego al server e effettuo la ricerca in base alla query creata
  imap.connect();
});

app.post("/multiple", (req, res) => {
  console.log("Received request on /multiple: %s", inspect(req.body));

  // Controlla che la richiesta abbia tutti i parametri necessari oppure risponde con un messaggio di errore
  if (!req.body || !req.body.subject || !req.body.year || !req.body.box || !imap) {
    res.json(JSON.stringify({ status: -2, error: "Bad request" }));
    return;
  }

  var query = [
    ["SINCE", `${req.body.year}`],
    ["BEFORE", `${+req.body.year + 1}`],
  ];
  query.push(recAddSubjects(req.body.subject));
  if (req.body.email != undefined) {
    query.push([
      "OR",
      ["OR", ["FROM", req.body.email], ["TO", req.body.email]],
      ["CC", req.body.email],
    ]);
  }

  // Funzione asincrona che cerca le mail una volta che è stabilita la connessione con il server Imap
  imap.once("ready", function () {
    countBox = 0;
    totalMail = 0;
    emailArray = new Array();

    imap.openBox(req.body.box[0], true, function moreOpen(err) {
      if (err) throw err;

      imap.search(query, function (err, results) {
        if (err) throw err;

        countMail = 0;

        if (results.length == 0) {
          countBox++;
          if (countBox < req.body.box.length) {
            imap.closeBox((err) => {
              imap.openBox(req.body.box[countBox], true, (err) => {
                moreOpen(err);
              });
            });
          } else {
            responseForClient =
              totalMail == 0
                ? { status: 0, nMail: 0 }
                : {
                    status: 1,
                    results: emailArray,
                    year: req.body.year,
                  };

            console.log("Risposta al client: " + inspect(responseForClient));
            res.json(JSON.stringify(responseForClient));
            responseForClient = undefined;
          }
          return;
        }

        var f = imap.fetch(results, {
          bodies: "",
        });

        console.log("Numero messaggi: " + results.length);
        f.on("message", function (msg) {
          msg.on("body", async function (stream) {
            simpleParser(stream, (err, mail) => {
              if (err) throw err;
              for (let sub of req.body.subject) {
                if (
                  mail.subject.toLowerCase().includes(sub.toLowerCase()) ||
                  (req.body.checkText &&
                    mail.text.toLowerCase().includes(sub.toLowerCase()))
                ) {
                  let index = req.body.subject.indexOf(sub);
                  totalMail++;

                  if (emailArray[index] == undefined) {
                    emailArray[index] = {
                      subject: sub,
                      nMail: 1,
                      mails: [],
                    };
                  } else {
                    emailArray[index].nMail++;
                  }

                  // Conta le mail FROM in Imap.parseHeader(buffer).from
                  if (mail.from) {
                    mail.from.value.forEach((currentValue) => {
                      if (
                        req.body.email == undefined ||
                        req.body.email == currentValue.address
                      ) {
                        var find = emailArray[index].mails.find(
                          (s) => s.mail == currentValue.address
                        );
                        if (find == undefined) {
                          find = {
                            mail: currentValue.address,
                            from: 0,
                            to: 0,
                            cc: 0,
                          };
                          emailArray[index].mails.push(find);
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
                        var find = emailArray[index].mails.find(
                          (s) => s.mail == currentValue.address
                        );
                        if (find == undefined) {
                          find = {
                            mail: currentValue.address,
                            from: 0,
                            to: 0,
                            cc: 0,
                          };
                          emailArray[index].mails.push(find);
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
                        var find = emailArray[index].mails.find(
                          (s) => s.mail == currentValue.address
                        );
                        if (find == undefined) {
                          find = {
                            mail: currentValue.address,
                            from: 0,
                            to: 0,
                            cc: 0,
                          };
                          emailArray[index].mails.push(find);
                        }
                        find.cc++;
                      }
                    });
                  }
                }
              }
              countMail++;
              if (countMail >= results.length) {
                countBox++;
                if (countBox < req.body.box.length) {
                  imap.closeBox((err) => {
                    imap.openBox(req.body.box[countBox], true, (err) => {
                      moreOpen(err);
                    });
                  });
                } else {
                  responseForClient =
                    totalMail == 0
                      ? { status: 0, nMail: 0 }
                      : {
                          status: 1,
                          results: emailArray,
                          year: req.body.year,
                        };

                  console.log(
                    "Risposta al client: " + inspect(responseForClient)
                  );
                  res.json(JSON.stringify(responseForClient));
                  responseForClient = undefined;
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
    });
  });

  imap.once("error", function (err) {
    console.log(err);
    res.json(JSON.stringify({ status: -1, error: err }));
  });

  // Mi collego al server e effettuo la ricerca in base alla query creata
  imap.connect();
});

var server = app.listen(port, host, () => {
  console.log(`Server Node listening at http://${host}:${port}`);
});

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

process.on("SIGINT", () => {
  if (imap) {
    imap.end();
  }
  server.close();
  console.log("Server correctly closed!");
});
