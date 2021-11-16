const { curly } = require("node-libcurl");

const username = 'andrea.cinelli@studenti.univr.it';
const pass = '(Tonta)31';

const findEmail = async (searchParam, email) => {
  const { statusCode, data, headers } = await curly.post('imaps://outlook.office365.com:993/INBOX/', {
    userPwd: `${username}:${pass}`,
    SSL_VERIFYPEER: false,
    CUSTOMREQUEST: `SEARCH ${searchParam} ${email}`
  });
  var response = data.toString();
  if (response.length==10)
    return 0;
  response = response.substr(9);
  var arrayResponse = response.split(' ').map(Number);
  var N_Email = arrayResponse.length;
  return N_Email;
}

exports.findEmail = findEmail;