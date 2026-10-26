# readme-arkiv-v2

Artikkel og utgavedatabase for studentmagasinet [readme](https://readme.abakus.no/).

Dette er et [Next.js](https://nextjs.org/)-prosjekt satt opp med [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app) og [Firebase](https://firebase.google.com/).

Dette er en videreutvikling av det [gamle arkivet](https://github.com/readme-ntnu/readme-arkiv), som var byget som en ren React-app.

## Kom igang

Først, sørg for at du har [Java (JDK)](https://openjdk.java.net/install/), [Node](https://nodejs.org) og [Yarn](https://yarnpkg.com) installert.

Klon deretter repoet og kjør følgende kommandoer

```bash
git clone git@github.com:readme-ntnu/readme-arkiv.git
cd readme-arkiv
yarn
cd functions
yarn
```

Så må du installere firebase-tools:

```bash
npm install -g firebase-tools
```

Du trenger også to filer (`.env.local` og `functions/.env.local`) med miljøvariabler. Spør [Viljan](https://github.com/viljanvr) for å få de. **NB! Disse filene må holdes hemmelig, da de inneholder sensitiv info!**

NB! For å kjøre firebase-emulatorer trenger du også Java installert.

Åpne to terminaler. I den ene starter du Firebase-emulatorene ved å skrive:

```bash
yarn emulators
```

I den andre starter du Next-serveren ved å skrive:

```bash
yarn dev
```

Arkivet bruker nå Firestore-samlingen `editions` som katalog. De innsjekkede
emulator-fixturene inneholder allerede disse dokumentene. Dersom du bruker et
eldre eller selvlaget Storage-datasett, kjører du følgende mens emulatorene er
startet for å opprette manglende katalogposter:

```bash
yarn editions:reconcile --apply
```

Du kan nå åpne nettsiden på [http://localhost:3000](http://localhost:3000).

NB! Dersom du gjør endringer i `functions/` underveis må du kompilere TypeScript filene på nytt for at Functions-emulatoren skal oppdatere seg. Åpne en ny terminal og skriv `yarn build` fra `functions/`-mappen. Alternativt kan du skrive `yarn build:watch`. Da vil TypeScript filene automatisk kompilerers hver gang du lagrer nye endringer.

### Test brukere

Du kan åpne admin-siden på [http://localhost:3000/admin](http://localhost:3000/admin).

Det finnes 3 test brukere i Firebase-emulatoren med forskjellig rettighetsnivåer:

- `user1@readme.no` med full admin-rettigheter (tilsvarende det redaktør og nestleder har)
- `user2@readme.no` med rettighetene til et vanlig readme-medlem
- `user3@readme.no` med default rettigheter

Alle brukerene har `password` som passord. Alternativt kan man logge inn med sin egen Abakus-bruker, men merk at man da arver rettighetene man har på [abakus.no](abakus.no).

## Deploy

Det er satt opp automatisk deploy til Vercel ved hjelp av deres GitHub-integrasjon. Push til master vil utløse et nytt bygg av nettsiden.

Det er også satt opp en callback-URL i Vercel som kan brukes til å utløse et nytt bygg. Dette skjer når nye utgaver lastes opp eller slettes, siden sidene som bruker PDF-ene eller bildene er statisk generert.

## Oversikt over systemet og dets funksjoner

(_OBS_: Dette er masse nerde-detaljer)

`readme` sitt arkiv består av tre deler: Next.js frontend-en, Firebase backend-en, og artikkelsøk i Algolia. Bildet under gir et oversiktsbilde.

![Overblikksbilde av arkitekturen](Architecture.png)

Vi tar de i tur og orden.

### Next.js frontend

Denne er satt opp med mest mulig Static Site Generation (SSG). Dette betyr at HTML-en til nettsidene generes når vi bygger applikasjonen, isteden for hver gang nettsidene åpnes. Det vil si at innholdet de fleste sidene, viktigst av alt forsiden, kun oppdateres når vi ber Vercel om å bygge nettsiden på nytt. Dette gjør at nettsidene laster kjapt, siden de kan forhåndslagres i sin helhet i CDN-et til Vercel.

#### Hendelser som utløser nytt bygg:

- Opplasting av en ny utgave
- Sletting av en utgave
- Erstatting av en utgave (egentlig samme operasjon som opplasting)
- Endring av innstillinger for visning av utgaver

### Firebase backend

Her har vi fire forskjellige biter:

**Functions:** Dette er den delen av backend-en som gjør beregninger for oss. I dette prosjektet har vi en fuksjon som lager en JPEG-thumbnail for oss hver gang noen laster opp en ny utgave. Denne funksjonen utløser også et nytt bygg av nettsiden.

**Storage:** Dette er hvor vi faktisk lagrer selve utgave-PDF-ene og de tilhørende JPEG-thumbnail-ene. Originalene ligger under `pdf/{år}/{år}-{utgave}.pdf`, valgfrie offentlig/redigerte versjoner ligger under `pdf_public/{år}/{år}-{utgave}_public.pdf`, og forsidebildene ligger under `images/{år}/{år}-{utgave}.jpg`. PDF-ene lastes opp direkte fra nettleseren til Storage og vises direkte fra Google Storage, slik at PDF-trafikken ikke går gjennom Vercel.

**Firestore:** Samlingen `editions` er den autoritative katalogen over utgaver. Hvert dokument heter `YYYY-NN` og inneholder `editionYear`, `editionNumber`, `listinglop` og tekniske beskrivelser i `originalPdf`, `publicPdf` og `thumbnail`. Filbeskrivelsene har også en `status` (`unknown`, `available`, `missing` eller `invalid`) som oppdateres når filene kontrolleres. `thumbnail.originalPdfGeneration` lagres bare i Firestore, ikke som metadata på Storage-filen. Eldre poster uten statusfeltet vises som `unknown` frem til en tilgangskontroll eller rekonsiliering. Signerte URL-er eller Firebase-nedlastings-URL-er lagres aldri i Firestore.

Samlingen `articles` inneholder artiklene i hver utgave. Artikkellenker skal bruke `/edition/YYYY-NN#page=N`, ikke en direkte Storage-URL. Merk at feltene kan være tomme, avhengig av typen artikkel.

| Feltnavn | Datatype        | Betydning                                                      | Eksempel                              |
| -------- | --------------- | -------------------------------------------------------------- | ------------------------------------- |
| author   | tekst           | Hvem som har skrevet artikkelen                                | "Tobias Skjelvik"                     |
| content  | tekst           | Det faktiske teksten i artikkelen                              | "readme er et veldig kult magasin..." |
| edition  | tekst           | Utgavenummer, på formen `{utgaveår}-0{utgavenummer}`           | "2023-01"                             |
| layout   | tekst           | Hvem som har hatt layout på artikkelen                         | "Øyvind Monsen"                       |
| pages    | liste med tall  | hvilke sider artikkelen er på iht. utgaveplanen                | [8, 9]                                |
| photo    | tekst           | Hvem som har tatt bilder til artikkelen                        | "Simen Holmestad"                     |
| tags     | liste med tekst | Stikkord som beksriver innholdet i artikkelen. Brukes til søk. | ["kake", "korona", "fest"]            |
| title    | tekst           | Artikkeloverskriften                                           | "Arrkoms korona-party: Hva er greia?" |
| type     | tekst           | Hvilken spalte artikkelen utkom i                              | "Gløsløken"                           |
| url      | tekst/lenke     | Kanonisk lenke til utgaven, med "page hash"                    | /edition/2021-03#page=5               |

Det finnes også en samling som heter `settings`. Denne har ett dokument som styrer litt hemmelig funksjonalitet i admin-siden.

**Auth:** Vi bruker Firebase Auth til å sikre autorisert tilgang til admin-funksjonene i arkivet, slik at utenforstående ikke kan tukle med utgavene og artiklene.

**Extensions:** Vi har en extension i produksjonsmiljøet som synkroniserer artikklene i Firestore med søket vårt i Algolia. Mer om søket litt lengre ned i readme-en.

### Algolia-søk

Vi bruker [Algolia](https://www.algolia.com/) for å drive søket på nettsiden. Indeksen der er synkronisert med Firestore-databasen, og gjør alle feltene utenom URL-en søkbare. Dette gir oss et fulltekst-søk med fuzzy matching.

## Tilganger

For å gjøre endringer i produksjonskonfigurasjonen til Firebase, Vercel, eller Algolia, må du få tilgang av en som allerede har det. Ta kontakt med [Viljan](https://github.com/viljanvr).

### Migrering av utgavekatalog

Vedlikeholdsverktøyet bruker Firebase-emulatorene og er skrivebeskyttet som
standard. Det oppretter manglende katalogposter og oppdaterer eksisterende
poster som avviker fra Storage:

```bash
yarn editions:reconcile
yarn editions:reconcile --apply
```

Bruk `--environment production` for å lese fra produksjon. Produksjonsendringer
krever i tillegg både `--apply` og eksplisitt `--confirm-project readme-arkiv`:

```bash
yarn editions:reconcile --environment production --project readme-arkiv
yarn editions:reconcile --environment production --project readme-arkiv \
  --apply --confirm-project readme-arkiv
```

Reconcile setter også PDF-enes synlige nedlastingsnavn til
`YYYY-NN.pdf` uten å endre Storage-stien, og retter gamle thumbnails som mangler
innholdstypen `image/jpeg`.

### Brukertilgang

Firebase-brukere kan gis readme-tilgang med brukerskriptet. Det bruker
Auth-emulatoren og kjører uten å skrive som standard:

```bash
yarn users:set-claims --email user@readme.no --member
yarn users:set-claims --email user@readme.no --admin --apply
yarn users:set-claims --email user@readme.no --remove --apply
yarn users:set-claims --email user@readme.no --list
```

Flere `--email`- og `--uid`-valg kan brukes i samme kjøring. Produksjonsendringer
krever `--environment production`, `--apply` og `--confirm-project`, på samme
måte som rekonsilieringsskriptet. Brukeren må logge inn på nytt eller oppdatere
ID-tokenet før endringene blir synlige. `--member` fjerner en eventuell rolle,
mens `--remove` fjerner både medlems- og rolle-claimet.

Sikkerhetsreglene deployes ikke automatisk ved push før migreringen er ferdig.
Kjør Firebase-workflowen manuelt med `deploy_security_rules` når katalogen er
oppdatert og den nye visningen er kontrollert i produksjon.
