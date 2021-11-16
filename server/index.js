const express = require("express");
const cors = require("cors");
const app = express();
const port = 3000;
app.use(cors());
var bodyParser = require("body-parser");
const { findEmail } = require("./serverImap");
app.use(bodyParser.json());

app.post("/", async (req, res) => {
  console.log(req.body);
  var email = req.body.email; //elisa.quintarelli@univr.it
  let N_FromEmail = await findEmail("FROM", email);
  let N_CcEmail = await findEmail("CC", email);
  let N_ToEmail = await findEmail("TO", email);

  var messageToClient = `{"email" : "${email}", "From" : ${N_FromEmail}, "Cc" :  ${N_CcEmail}, "To" : ${N_ToEmail}}`
  console.log(messageToClient);
  res.json(messageToClient);
});

app.listen(port, () => {
  console.log(`Server Node listening at http://localhost:${port}`);
});
