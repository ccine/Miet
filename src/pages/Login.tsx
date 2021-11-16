import {
  IonHeader,
  IonContent,
  IonToolbar,
  IonLabel,
  IonItem,
  IonInput,
  IonButton,
  IonGrid,
  IonRow,
  IonCol,
  IonAlert,
  IonPage,
  IonTitle,
  IonLoading,
  IonCard,
  IonCardContent
} from "@ionic/react";
import React from "react";
import { useRef, useState } from "react";
import { useHistory } from "react-router-dom";

const Login: React.FC = () => {
  const emailRef = useRef<HTMLIonInputElement>(null); // Riferimento all'email
  const pwdRef = useRef<HTMLIonInputElement>(null); // Riferimento alla password
  const [error, setError] = useState<boolean>(false); // Stato di errore
  const [errorMessage, setErrorMessage] = useState<string>(); // Stato di messaggio di errore
  const [showLoading, setShowLoading] = useState<boolean>(false); // Stato del loading
  const history = useHistory<{ user: string; boxes: string[] }>();

  const checkData = () => {
    var email = "";
    var pwd = "";

    email = "" + emailRef.current!.value;
    if (email == "") {
      setErrorMessage("Inserisci una mail");
      setError(true);
      return;
    }

    pwd = "" + pwdRef.current!.value;
    if (pwd == "") {
      setErrorMessage("Inserisci una password");
      setError(true);
      return;
    }

    setShowLoading(true);

    // Invio ed attendo risposta
    fetch("http://localhost:32325/login", {
      method: "post",
      headers: new Headers({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        user: email,
        pass: pwd,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        setShowLoading(false);
        if (JSON.parse(data).status == 1) {
          history.push({
            pathname: "/Pagina",
            state: { user: email, boxes: JSON.parse(data).boxes },
          });
        } else {
          setErrorMessage("Utente o password errate");
          setError(true);
          clearInputs();
        }
      })
      .catch((serverError) => {
        setShowLoading(false);
        setErrorMessage(
          "Impossibile comunicare con il server.\n" + serverError
        );
        setError(true);
      });
  };

  // Pulisce lo stato errore
  const clearError = () => {
    setErrorMessage("");
    setError(false);
  };

  // Pulissce i campi
  const clearInputs = () => {
    if (emailRef.current != undefined) emailRef.current!.value = "";
    if (pwdRef.current != undefined) pwdRef.current!.value = "";
  };

  //clearInputs();
  return (
    <IonPage>

      {/* Allerta di errore */}
      <IonAlert
        isOpen={!!error}
        message={errorMessage}
        buttons = {[{text: "Okay", handler: clearError}]}
        onWillDismiss={() => clearError}
      />

      {/* Barra con nome dell'applicazione */}
      <IonHeader>
        <IonToolbar mode="ios">
          <IonTitle>MIET</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">

        {/* Inizio griglia */}
        <IonGrid className="ion-text-center" fixed={true}>

          <IonRow className="ion-margin">
            <IonCol offset="4" size="4">
              <IonCard color="light" style={{ width: "100%"}}>
                <IonCardContent>
                  <h2><b>Inserisci credenziali di OUTLOOK365</b></h2>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {/* Campo dove inserire la mail */}
          <IonRow className="ion-margin">
            <IonCol offset="3" size="6">
              <p className="ion-text-left">Inserisci utente</p>
              <IonItem>
                <IonLabel></IonLabel>
                <IonInput ref={emailRef} type="email"></IonInput>
              </IonItem>
            </IonCol>
          </IonRow>

          {/* Campo dove inserire la password */}
          <IonRow className="ion-margin">
            <IonCol offset="3" size="6">
              <p className="ion-text-left">Inserisci password</p>
              <IonItem>
                <IonLabel></IonLabel>
                <IonInput ref={pwdRef} type="password" onKeyDown={(e) => {if(e.key == "Enter") checkData()}} ></IonInput>
              </IonItem>
            </IonCol>
          </IonRow>

          {/* Bottone per loggare */}
          <IonRow className="ion-margin">
            <IonCol>
              <IonButton onClick={checkData}>Login</IonButton>
              <IonLoading
                isOpen={showLoading}
                onDidDismiss={() => setShowLoading(false)}
                message={'Please wait...'}
              />
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default Login;
