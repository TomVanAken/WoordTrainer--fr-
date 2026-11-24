# Woordtrainer

Een oefen-app voor Franse en Nederlandse woordjes uit het schoolboek. Werkt op de telefoon en de computer.

## Lokaal draaien

```
npm install
npm run dev
```

Open daarna het adres dat in de terminal verschijnt (meestal http://localhost:5173).
Tests draaien met `npm test`, de hoofdstukken controleren met `npm run check-chapters`.

## Publiceren (gratis, via GitHub Pages)

Doe het in deze volgorde, anders mislukt de eerste publicatie:

1. Maak op GitHub een nieuwe, **openbare** (public) repo aan. Push nog niets.
2. Ga in die repo naar Settings → Pages en kies bij Source: **GitHub Actions**.
3. Push nu de code naar de branch `main`. De publicatie start vanzelf (tabblad Actions → Deploy).
4. Is die eerste run toch mislukt? Ga naar Actions → Deploy, open de mislukte run en klik op **Re-run jobs**.
5. Na een paar minuten staat de app online. De link staat bovenaan bij Settings → Pages ("Your site is live at …").
6. Open de link op de telefoon en zet de app op het beginscherm:
   - **iPhone** (Safari): deelknop → **Zet op beginscherm**.
   - **Android** (Chrome): menu ⋮ → **Toevoegen aan startscherm** of **App installeren**.

Alleen een wijziging in de code zorgt voor een nieuwe publicatie. Een nieuw hoofdstuk niet.

## Een hoofdstuk toevoegen

1. Stuur foto's van het hoofdstuk naar Claude.
2. Claude schrijft `public/chapters/chNN.json` (enkelvoudige zelfstandige naamwoorden altijd met *un/une*, woorden die alleen in het meervoud bestaan met *des* en een `"gender": "m"` of `"f"`).
3. Claude zet het bestand in `public/chapters/index.json`, draait `npm run check-chapters`, commit en pusht.

Het hoofdstuk is binnen ongeveer 5 minuten live, zonder dat de app opnieuw gepubliceerd wordt: de app leest de hoofdstukken rechtstreeks uit de repo.

## Goed om te weten

- Haal `ch00.json` (het voorbeeldhoofdstuk) uit `index.json` zodra de echte hoofdstukken erin staan.
- Ids in een hoofdstuk mogen nooit veranderen en worden nooit hergebruikt, anders klopt de voortgang niet meer.
