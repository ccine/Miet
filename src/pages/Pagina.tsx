import {
  IonHeader,
  IonContent,
  IonToolbar,
  IonSegment,
  IonLabel,
  IonSegmentButton,
  IonItem,
  IonInput,
  IonButton,
  IonGrid,
  IonRow,
  IonCol,
  IonAlert,
  IonDatetime,
  IonCard,
  IonCardContent,
  IonIcon,
  IonPage,
  IonTitle,
  IonCheckbox,
  AlertInput,
  IonLoading
} from "@ionic/react";
import { useRef, useState } from "react";
import { closeCircleOutline } from "ionicons/icons";
import { useHistory } from "react-router";
import Chart from "../components/Chart.js";

var currentYear = new Date().getFullYear().toString(); // Anno attuale (utilizzato diverse volte nel codice)
var value = ""; // Variabile dove salvare il tipo di ricerca che si ha richiesto
var selectedBoxes: string[];
var storedDataCSV = ""; // Variabile dove salvare la ricerca effettuata (usata nel caso si vuole salvare l'ultima ricerca effettuata ma si è cambianto il segmento)
var months = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
]; // Array con i mesi dell'anno

const Pagina: React.FC = () => {
  var history = useHistory<{ user: string; boxes: string[] }>();

  // Permette di tornare indietro in caso di violazione
  if (
    history.location.state == undefined ||
    history.location.state.user == ""
  ) {
    history.goBack();
  }

  const [selectedValue, setValue] =
    useState<"annual" | "custom" | "multiple">("annual"); // Stato di mittente, destinatario o entrambi
  const [error, setError] = useState<"object" | "mail" | "server" | null>(null); // Stato di errore
  const [errorMessage, setErrorMessage] = useState<string>(); // Messaggio di errore
  const [selectedDateMin, setSelectedDateMin] = useState<string>(); // Stato della data di inizio
  const [selectedDateMax, setSelectedDateMax] = useState<string>(); // Stato della data di fine
  const [calculatedCont, setCalculatedCont] = useState<boolean>(false); // Stato del risultato
  const [checkedBox, setCheckedBox] = useState<boolean>(false); // Stado della CheckBox
  const [directoryBool, setDirectoryBool] = useState<boolean>(true); // Stato del risultato
  const [pieChart, setPieChart] = useState<{ chartData: {} }>({
    chartData: {},
  }); // Stato del grafico
  const [drawChart, setDrawChart] = useState<boolean>(false); // Stato per disegnare il grafico
  const [showLoading, setShowLoading] = useState<boolean>(false); // Stato del loading
  const emailRef = useRef<HTMLIonInputElement>(null); // Riferimento della mail
  const objectRef = useRef<HTMLIonInputElement>(null); // Riferimento all'oggetto della mail
  const dateStartRef = useRef<HTMLIonDatetimeElement>(null); // Rifermiento della data di inizio in caso di ricerca personalizzata
  const dateEndRef = useRef<HTMLIonDatetimeElement>(null); // Riferimento della data di fine in caso di ricerca personalizzata
  const searchButtonRef = useRef<HTMLIonButtonElement>(null); // Riferimento al bottone di conferma ricerca
  const btnExportRef = useRef<HTMLIonButtonElement>(null); // Riferimento al bottone di esportare in csv
  const yearRef = useRef<HTMLIonInputElement>(null); // Riferimento dell'anno in caso di ricerca annuale
  var resultArea = document.getElementById("result"); // Riferimento alla preview
  var textTotal = document.getElementById("total"); // Riferimento al testo di totale mail
  var previewHeader = document.getElementById("previewHeader"); // Riferimento al testo di totale mail

  // Trasforma una variabile Date in una stringa "giorno-mese-anno"
  function returnDay(day: Date) {
    var dd = String(day.getDate()).padStart(2, "0");
    var mm = String(day.getMonth() + 1).padStart(2, "0");
    var yyyy = day.getFullYear();
    return yyyy + "-" + mm + "-" + dd;
  }

  // Funzione che invia i dati al server
  const Search = () => {
    
    setCalculatedCont(false);
    setDrawChart(false);

    
    var email;
    var object;
    var year;
    value = selectedValue;


    if (value != "multiple") {
      email = "" + emailRef.current!.value;

      // Regex(=espressione regolare) di un indirizzo mail
      const re =
        /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;

      // Controllo se la mail è corretta
      if (!re.test(String(email).toLowerCase()) && email != "") {
        setErrorMessage("Inserisci correttamente una mail");
        setError("mail");
        return;
      }

      if (email == "") email = undefined;
    }

    // Controllo se il campo oggetto è riempito
    object = "" + objectRef.current!.value;

    if (object == "") {
      setErrorMessage("Inserisci correttamente un oggetto");
      setError("object");
      return;
    }

    // Controllo sul campo anno
    if (value != "custom") {
      year = "" + yearRef.current!.value;

     
      if (year == "") {
        year = currentYear;
        yearRef.current!.value = "" + currentYear;
      }
    }

    else{
      if(selectedDateMin && selectedDateMax && selectedDateMin! > selectedDateMax!){
        setErrorMessage("DataInizio deve essere minore di DataFine");
        setError("date");
        return;
      }
    }
    

    // Disabilito il tasto di ricerca
    setShowLoading(true);
    searchButtonRef.current!.disabled = true;

    // Ricerca annuale
    if (value == "annual") {
      // Invio ed attendo risposta
      fetch("http://localhost:32325/annual", {
        method: "post",
        headers: new Headers({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          email: email,
          subject: object,
          year: year,
          checkText: checkedBox,
          box: selectedBoxes,
        }),
      })
        .then((response) => response.json())
        
        .then((data) => receivedData(data))
        .catch((serverError) => {
          
          setShowLoading(false);
          setErrorMessage(
            "Impossibile comunicare con il server.\n" + serverError
          );
          setError("server");
          if (searchButtonRef.current != undefined)
            searchButtonRef.current!.disabled = false;
        });
    }

    // Ricerca personalizzata
    else if (value == "custom") {
      // Invio ed attendo risposta
      fetch("http://localhost:32325/custom", {
        method: "post",
        headers: new Headers({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          email: email,
          subject: object,
          startDate: selectedDateMin?.split("T")[0],
          endDate: selectedDateMax?.split("T")[0],
          checkText: checkedBox,
          box: selectedBoxes,
        }),
      })
        .then((response) => response.json())
        
        .then((data) => receivedData(data))
        .catch((serverError) => {
          
          setShowLoading(false);
          setErrorMessage(
            "Impossibile comunicare con il server.\n" + serverError
          );
          setError("server");
          searchButtonRef.current!.disabled = false;
        });
    }

    // Ricerca di più commesse
    else {
      // Invio ed attendo risposta
      fetch("http://localhost:32325/multiple", {
        method: "post",
        headers: new Headers({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          subject: object.split(","),
          year: year,
          checkText: checkedBox,
          box: selectedBoxes,
        }),
      })
        .then((response) => response.json())
        
        .then((data) => receivedData(data))
        .catch((serverError) => {
          
          setShowLoading(false);
          setErrorMessage(
            "Impossibile comunicare con il server.\n" + serverError
          );
          setError("server");
          searchButtonRef.current!.disabled = false;
        });
    }
  };

  // Funzione che crea la preview
  const createPreview = (data: any) => {
    var resultElement;
    var parameters: { str: string; emailList: string[]; dataset: number[] };

    switch (data.status) {
      // Nessuna mail ricevuta
      case 0:
        resultArea!.innerHTML = "";
        resultElement = document.createElement("h2");
        resultElement.innerHTML = `Non sono state trovate mail`;
        resultArea?.appendChild(resultElement);
        btnExportRef.current!.disabled = true;
        break;

      // Mail ricevuta/e
      case 1:
        // Ricerca personalizzata
        if (value == "custom") {
          parameters = customPreview(data);
        }

        // Ricerca di più commesse
        else if (value == "multiple") {
          parameters = multiplePreview(data);
        }

        // Ricerca annuale
        else {
          parameters = annualPreview(data);
        }

        
        storedDataCSV = "data:application/csv;charset=utf-8, ".concat(
          parameters!.str
        );
        makePieChart(parameters!.emailList, parameters!.dataset);

        break;

      // Errore del server
      case -1:
        resultArea!.innerHTML = "";
        resultElement = document.createElement("h2");
        resultElement.innerHTML = `Errore del server`;
        resultArea?.appendChild(resultElement);
        btnExportRef.current!.disabled = true;
        break;

      // Bad request
      case -2:
        resultArea!.innerHTML = "";
        resultElement = document.createElement("h2");
        resultElement.innerHTML = `Richiesta non valida`;
        resultArea?.appendChild(resultElement);
        btnExportRef.current!.disabled = true;
        break;
    }
  };

  // Crezione anteprime di ricerca personalizzata
  const customPreview = (data: any) => {
    var temp = data;
    var totMail = data.nMail;
    var resultElement;
    var str = "";
    var dataset: number[];
    var emailList: string[];

    data = data.results;
    dataset = new Array();
    emailList = new Array();

    // Anteprima risultati
    resultElement = document.createElement("tr");
    resultElement.innerHTML = `
      <th>Mail</th>
      <th>Mittente</th>
      <th>Destinatario</th>
      <th>Copia</th>`;
    resultArea?.appendChild(resultElement);

    for (var i = 0; i < data.length; i++) {
      resultElement = document.createElement("tr");
      resultElement.innerHTML = `
        <td>${data[i].mail}</td>
        <td>${data[i].from}</td>
        <td>${data[i].to}</td>
        <td>${data[i].cc}</td>
        `;
      resultArea?.appendChild(resultElement);
    }
    textTotal = document.getElementById("total");
    textTotal!.innerHTML = `<b>Totale mail:</b> ` + totMail;

    // Coversione CSV
    str = "Commessa;" + temp.subject + "\n";

    if (temp.startDate != undefined)
      str += "DataInizio;" + temp.startDate + "\n";

    if (temp.endDate != undefined) str += "DataFine;" + temp.endDate + "\n";

    str += "\n;";

    temp = temp.results;

    // Elenco di mail
    for (var i = 0; i < temp.length; i++) {
      str += temp[i].mail + ";";
      emailList.push(temp[i].mail);
    }
    str += "\n";
    dataset = new Array(emailList.length).fill(0);

    // Riga from
    str += "from;";
    for (var i = 0; i < temp.length; i++) {
      str += temp[i].from + ";";
      dataset[emailList.indexOf(temp[i].mail)] += temp[i].from; // serve per grafico
    }
    str += "\n";

    // Riga to
    str += "to;";
    for (var i = 0; i < temp.length; i++) {
      str += temp[i].to + ";";
      dataset[emailList.indexOf(temp[i].mail)] += temp[i].to; // serve per grafico
    }
    str += "\n";

    // Riga cc
    str += "cc;";
    for (var i = 0; i < temp.length; i++) {
      str += temp[i].cc + ";";
      dataset[emailList.indexOf(temp[i].mail)] += temp[i].cc; // serve per grafico
    }
    str += "\n\n";

    // Totale mail
    str += "Totale_Mail: ;" + totMail;

    return { str, emailList, dataset };
  };

  // Crezione anteprime di ricerca annuale
  const annualPreview = (data: any) => {
    var temp = data;
    var totMail = data.nMail;
    var resultElement;
    var str = "";
    var sum;
    var dataset: number[];
    var emailList: string[];

    data = data.results;
    dataset = new Array();
    emailList = new Array();

    // Anteprima risultati
    previewHeader = document.getElementById("previewHeader");
    previewHeader!.innerHTML = `<b>Anno: </b>` + temp.year;

    resultElement = document.createElement("tr");
    resultElement.innerHTML = `
      <th>Mese</th>
      <th>Totale mail</th>`;
    resultArea?.appendChild(resultElement);

    for (var i = 0; i < months.length; i++) {
      sum = 0;
      for (var j = 0; data[i] != null && j < data[i].length; j++)
        sum += data[i][j].from + data[i][j].to + data[i][j].cc;

      resultElement = document.createElement("tr");
      resultElement.innerHTML = `
        <td>${months[i]}</td>
        <td>${sum}</td>
        `;
      resultArea?.appendChild(resultElement);
    }

    // Coversione CSV
    str = "Anno;" + temp.year + "\nCommessa;" + temp.subject + "\n\n;";

    // Elenco di mail
    for (let i = 0; i < data.length; i++) {
      if (data[i] != undefined) {
        for (let j = 0; j < data[i].length; j++) {
          let mail = data[i][j].mail;
          if (emailList.indexOf(mail) == -1) {
            str += mail + ";";
            emailList.push(mail);
          }
        }
      }
    }
    str += "\n";
    dataset = new Array(emailList.length).fill(0);

    // Tabella delle mail per ogni mese
    for (let i = 0; i < months.length; i++) {
      str += months[i].toUpperCase() + "\n";
      if (data[i] != undefined) {
        for (let k = 0; k < 3; k++) {
          switch (k) {
            case 0:
              str += "From;";
              break;
            case 1:
              str += "To;";
              break;
            case 2:
              str += "Cc;";
              break;
          }

          emailList.forEach(function (mail) {
            let index = data[i].findIndex(
              (value: { mail: any }) => value.mail == mail
            );
            if (index != -1) {
              switch (k) {
                case 0:
                  str += data[i][index].from + ";";
                  dataset[emailList.indexOf(mail)] += data[i][index].from; // serve per grafico
                  break;
                case 1:
                  str += data[i][index].to + ";";
                  dataset[emailList.indexOf(mail)] += data[i][index].to; // serve per grafico
                  break;
                case 2:
                  str += data[i][index].cc + ";";
                  dataset[emailList.indexOf(mail)] += data[i][index].cc; // serve per grafico
                  break;
              }
            } else {
              str += ";";
            }
          });
          str += "\n";
        }
      }
      str += "\n";
    }
    str += "\n";

    // Totale mail
    str += "Totale_Mail: ;" + totMail;

    return { str, emailList, dataset };
  };

  // Crezione anteprime di ricerca di più commesse
  const multiplePreview = (data: any) => {
    var temp = data;
    var resultElement;
    var str = "";
    var sum = 0;
    var dataset: number[];
    var emailList: string[];

    data = data.results;
    dataset = new Array();
    emailList = new Array();

    // Anteprima risultati
    previewHeader = document.getElementById("previewHeader");
    previewHeader!.innerHTML = `<b>Anno: </b>` + temp.year;

    resultElement = document.createElement("tr");
    resultElement.innerHTML = `
      <th>Commessa</th>
      <th>Totale mail</th>`;
    resultArea?.appendChild(resultElement);

    for (var i = 0; i < data.length; i++) {
      if (data[i] != null) {
        resultElement = document.createElement("tr");
        resultElement.innerHTML = `
          <td>${data[i].subject}</td>
          <td>${data[i].nMail}</td>
          `;
        resultArea?.appendChild(resultElement);
      }
    }

    // Conversione CSV
    str = "Anno;" + temp.year + "\n\n";
    sum = 0;

    // Elenco di mail
    for (let i = 0; i < data.length; i++) {
      if (data[i] != null) {
        for (let j = 0; j < data[i].mails.length; j++) {
          let mail = data[i].mails[j].mail;
          if (emailList.indexOf(mail) == -1) emailList.push(mail);
        }
      }
    }

    // Tabella delle mail per ogni mese
    for (var i = 0; i < data.length; i++) {
      if (data[i] != null) {
        str += data[i].subject + ";";
        sum = 0;

        emailList.forEach(function (mail) {
          let index = data[i].mails.findIndex(
            (value: { mail: any }) => value.mail == mail
          );
          if (index != -1) {
            str += data[i].mails[index].from + ";";
            sum += data[i].mails[index].from;
          } else str += "0;";
        });

        dataset.push(sum);
        str += sum + "\n";
      }
    }

    str += ";";
    for (var i = 0; i < emailList.length; i++) str += `${emailList[i]};`;
    str += "Totale_mail\n";

    emailList = new Array();
    temp = temp.results;
    for (var i = 0; i < temp.length; i++)
      emailList.push(temp[i].subject);

    return { str, emailList, dataset };
  };

  // Funzione che mi permette di pulire tutti i campi
  const Reset = () => {
    if (selectedValue != "custom" && yearRef.current != null)
      yearRef.current!.value = "";

    if (selectedValue == "custom") {
      clearDateStart();
      clearDateEnd();
    }

    if (selectedValue != "multiple" && emailRef.current != null)
      emailRef.current!.value = "";

    if (objectRef.current != undefined) objectRef.current!.value = "";
    setCheckedBox(false);
  };

  // Funzione chiamata alla ricezione dei dati
  function receivedData(data: any) {
    setShowLoading(false);
    setCalculatedCont(true);
    data = JSON.parse(data);
    searchButtonRef.current!.disabled = false;
    resultArea = document.getElementById("result");
    createPreview(data);
    if(data.status == 1) 
      setDrawChart(true);
    btnExportRef.current!.setAttribute("href", storedDataCSV);
  }

  // Cambia il tipo di ricerca (annuale, personalizzata)
  const changeValue = (event: CustomEvent) => {
    setValue(event.detail.value);
    if (storedDataCSV != "" && btnExportRef.current != null)
      btnExportRef.current!.setAttribute("href", storedDataCSV);
    Reset();
  };

  // Pulisce lo stato errore
  const clearError = () => {
    setErrorMessage("");
    if (error == "mail") emailRef.current!.value = "";
    else if (error == "object") objectRef.current!.value = "";
    else if (error == "server") {
      selectedBoxes = [];
      history.goBack();
    }
    else if (error == "date") {
      clearDateStart();
      clearDateEnd();
    }
    
    setError(null);
  };

  // Pulisce la data di inizio
  const clearDateStart = () => {
    if (dateStartRef.current != null) dateStartRef.current!.value = null;
    setSelectedDateMin(undefined);
  };

  // Pulisce la data di fine
  const clearDateEnd = () => {
    if (dateEndRef.current != null) dateEndRef.current!.value = null;
    setSelectedDateMax(undefined);
  };

  // Sistema il numero dell'anno non appena il mouse esce dal campo stesso
  const updateYear = () => {
    if (
      yearRef.current!.value! < parseInt(yearRef.current!.min!) &&
      yearRef.current != null
    )
      yearRef.current.value = 0;
    if (
      yearRef.current!.value! > parseInt(yearRef.current!.max!) &&
      yearRef.current != null
    )
      yearRef.current.value = yearRef.current.max;
  };

  // Funzione per disconnettersi e tornare a login
  const logOut = () => {
    selectedBoxes = [];
    history.goBack();
  };

  // Funzione che crea l'array di cartelle di posta per l'alert
  const makeCheckBoxes = () => {
    var inputs: AlertInput[];
    var element: AlertInput;
    var check: boolean;
    inputs = [];
    if (history.location.state != undefined) {
      for (var i = 0; i < history.location.state.boxes.length; i++) {
        check = true;
        if (
          selectedBoxes != undefined &&
          selectedBoxes.length > 0 &&
          selectedBoxes.indexOf(history.location.state.boxes[i]) == -1
        )
          check = false;

        element = {
          name: "checkbox" + i,
          type: "checkbox",
          label: history.location.state.boxes[i],
          value: history.location.state.boxes[i],
          checked: check,
        };
        inputs.push(element);
      }
    }
    return inputs;
  };

  // Comunica al server su quali cartelle effettuaremo la ricerca
  const storeBoxes = (data: string[]) => {
    setDirectoryBool(false);
    if (data == undefined || data.length == 0) setDirectoryBool(true);
    else selectedBoxes = data;
  };

  // Creazione grafico
  const makePieChart = (labels: string[], dataset: number[]) => {
    const colorScheme = [
      "#25CCF7",
      "#FD7272",
      "#54a0ff",
      "#00d2d3",
      "#1abc9c",
      "#2ecc71",
      "#3498db",
      "#9b59b6",
      "#34495e",
      "#16a085",
      "#27ae60",
      "#2980b9",
      "#8e44ad",
      "#2c3e50",
      "#f1c40f",
      "#e67e22",
      "#e74c3c",
      "#ecf0f1",
      "#95a5a6",
      "#f39c12",
      "#d35400",
      "#c0392b",
      "#bdc3c7",
      "#7f8c8d",
      "#55efc4",
      "#81ecec",
      "#74b9ff",
      "#a29bfe",
      "#dfe6e9",
      "#00b894",
      "#00cec9",
      "#0984e3",
      "#6c5ce7",
      "#ffeaa7",
      "#fab1a0",
      "#ff7675",
      "#fd79a8",
      "#fdcb6e",
      "#e17055",
      "#d63031",
      "#feca57",
      "#5f27cd",
      "#54a0ff",
      "#01a3a4",
    ];
    var coloR = [];
    var dynamicColors = function () {
      var r = Math.floor(Math.random() * 255);
      var g = Math.floor(Math.random() * 255);
      var b = Math.floor(Math.random() * 255);
      return "rgb(" + r + "," + g + "," + b + ")";
    };

    if (labels.length > colorScheme.length) {
      coloR.push(colorScheme);
      for (var i = colorScheme.length; i < labels.length; i++) {
        coloR.push(dynamicColors());
      }
    } else {
      var rng;
      for (let i in labels) {
        rng = Math.floor(Math.random() * colorScheme.length);
        coloR.push(colorScheme[rng]);
        colorScheme.splice(rng, 1);
      }
    }

    
    setPieChart({
      chartData: {
        labels: labels,
        datasets: [
          {
            label: "#mail",
            data: dataset,
            backgroundColor: coloR,
          },
        ],
      },
    });
  };

  //Reset();
  // Corpo Ionic dell'App
  return (
    <IonPage>
      {/* Alert che permette di selezionare le cartelle su cui effettuare le ricerche */}
      <IonAlert
        isOpen={directoryBool}
        header={"Seleziona le cartelle su cui vuoi fare le ricerche"}
        inputs={makeCheckBoxes()}
        buttons={[{ text: "Okay" }]}
        onWillDismiss={(e) => storeBoxes(e.detail.data?.values)}
      />

      {/* Allerta di errore */}
      <IonAlert
        isOpen={!!error}
        message={errorMessage}
        buttons={[{ text: "Okay", handler: clearError }]}
        onWillDismiss={() => clearError()}
      />

      {/* Barra con nome dell'applicazione */}
      <IonHeader>
        <IonToolbar mode="ios">
          <IonTitle>MIET</IonTitle>
          <IonButton
            onClick={() => setDirectoryBool(true)}
            mode="md"
            slot="end"
            color="primary"
            className="ion-margin"
          >
            Cambia le cartelle
          </IonButton>
          <IonButton
            onClick={logOut}
            mode="md"
            slot="end"
            color="primary"
            className="ion-margin"
          >
            LogOut
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {/* Componente a scelta multipla (annuale, personalizzata) */}
        <IonSegment value={selectedValue} onIonChange={changeValue}>
          <IonSegmentButton value="annual">
            <IonLabel>Annuale</IonLabel>
          </IonSegmentButton>

          <IonSegmentButton value="custom">
            <IonLabel>Personalizzata</IonLabel>
          </IonSegmentButton>

          <IonSegmentButton value="multiple">
            <IonLabel>Più commesse</IonLabel>
          </IonSegmentButton>
        </IonSegment>

        {/* Inizio griglia */}
        <IonGrid className="ion-text-center" fixed={true}>
          {/* Campo dove inserire l'oggetto della mail */}
          <IonRow className="ion-margin">
            <IonCol offset="3" size="6">
              {selectedValue != "multiple" && (
                <p className="ion-text-left">Inserisci oggetto</p>
              )}
              {selectedValue == "multiple" && (
                <p className="ion-text-left">Inserisci oggetti</p>
              )}
              <IonItem>
                <IonLabel></IonLabel>
                {selectedValue != "multiple" && (
                  <IonInput ref={objectRef}></IonInput>
                )}
                {selectedValue == "multiple" && (
                  <IonInput
                    placeholder="Example: commessa1, commessa2, comessa3"
                    ref={objectRef}
                  ></IonInput>
                )}
              </IonItem>
            </IonCol>
          </IonRow>

          {/* CheckBox per chiedere all'utente se desidera estendere la ricerca anche all'interno del corpo delle mail */}
          <IonRow className="ion-margin">
            <IonCol offset="4" size="4">
              <IonItem>
                <IonCheckbox
                  checked={checkedBox}
                  onIonChange={(e) => setCheckedBox(e.detail.checked)}
                />
                <IonLabel className="ion-text-right">
                  <b>Cercare anche nel corpo delle mail?</b>
                </IonLabel>
              </IonItem>
            </IonCol>
          </IonRow>

          {/* Campo dove inserire la mail */}
          {selectedValue != "multiple" && (
            <IonRow className="ion-margin">
              <IonCol offset="3" size="6">
                <p className="ion-text-left">Inserisci email</p>
                <IonItem>
                  <IonLabel></IonLabel>
                  <IonInput
                    placeholder="Campo non obbligatorio"
                    type="email"
                    ref={emailRef}
                  ></IonInput>
                </IonItem>
              </IonCol>
            </IonRow>
          )}

          {/* Campo dove inserire la data di inizio */}
          {selectedValue == "custom" && (
            <IonRow className="ion-margin">
              <IonCol offset="3" size="3">
                <p className="ion-text-left">Inserisci Data Inizio</p>
                <IonItem>
                  <IonDatetime
                    ref={dateStartRef}
                    displayFormat="D M YYYY"
                    placeholder="Seleziona Data"
                    max={returnDay(new Date())}
                    onIonChange={(e) => setSelectedDateMin(e.detail.value!)}
                  ></IonDatetime>
                  <IonButton
                    onClick={clearDateStart}
                    fill="clear"
                    slot="end"
                    size="default"
                    color="medium"
                  >
                    <IonIcon icon={closeCircleOutline}></IonIcon>
                  </IonButton>
                </IonItem>
              </IonCol>

              {/* Campo dove inserire la data di fine */}
              <IonCol size="3">
                <p className="ion-text-left">Inserisci Data Fine</p>
                <IonItem>
                  <IonDatetime
                    ref={dateEndRef}
                    displayFormat="D M YYYY"
                    placeholder="Seleziona Data"
                    max={returnDay(new Date())}
                    onIonChange={(e) => setSelectedDateMax(e.detail.value!)}
                  ></IonDatetime>
                  <IonButton
                    onClick={clearDateEnd}
                    fill="clear"
                    slot="end"
                    size="default"
                    color="medium"
                  >
                    <IonIcon icon={closeCircleOutline}></IonIcon>
                  </IonButton>
                </IonItem>
              </IonCol>
            </IonRow>
          )}

          {/* Campo nel quale inserire l'anno, nel caso si voglia effettuare una ricerca annuale */}
          {selectedValue != "custom" && (
            <IonRow className="ion-margin">
              <IonCol offset="4" size="4">
                <p className="ion-text-left">Inserisci anno</p>
                <IonItem>
                  <IonLabel></IonLabel>
                  <IonInput
                    type="number"
                    ref={yearRef}
                    id="yearNumber"
                    max={currentYear}
                    min="0"
                    onIonChange={updateYear}
                  ></IonInput>
                </IonItem>
              </IonCol>
            </IonRow>
          )}

          {/* Bottone per inviare dati al server */}
          <IonRow className="ion-margin">
            <IonCol className="ion-text-right">
              <IonButton ref={searchButtonRef} onClick={Search}>
                Cerca
              </IonButton>
              <IonLoading
                isOpen={showLoading}
                onDidDismiss={() => setShowLoading(false)}
                message={'Please wait...'}
              />
            </IonCol>

            {/* Bottone per svuotare tutti i campi */}
            <IonCol className="ion-text-left">
              <IonButton onClick={Reset}>Reset</IonButton>
            </IonCol>
          </IonRow>

          {/* Anteprime */}
          <IonRow>
            {/* Anteprima del risultato */}
            {calculatedCont && (
              <IonCol>
                <IonCard>
                  <IonCardContent>
                    <h2 id="previewHeader"></h2>
                    <table style={{ width: "100%" }}>
                      <tbody id="result"></tbody>
                    </table>
                    <h2 id="total"></h2>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            )}

            {/* Grafico a torta */}
            {drawChart && (
              <IonCol>
                <IonCard>
                  <Chart
                    chartData={pieChart!.chartData}
                    location="Massachusetts"
                    legendPosition="bottom"
                  />
                </IonCard>
              </IonCol>
            )}
          </IonRow>

          {/* Pulsante per esportare su file, viene mostrato solo nel caso vi sia un risulato alla richiesta fatta */}
          {calculatedCont && (
            <IonRow className="ion-margin">
              <IonCol>
                <IonButton ref={btnExportRef} download="data.csv" href="#">
                  Esporta
                </IonButton>
              </IonCol>
            </IonRow>
          )}
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default Pagina;
