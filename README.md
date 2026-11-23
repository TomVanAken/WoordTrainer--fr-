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

1. Maak een **openbare** (public) repo op GitHub en push de code naar de branch `main`.
2. Ga naar Settings → Pages en kies bij Source: **GitHub Actions**.
3. Na een paar minuten staat de app online. Open de link op de telefoon en kies "Zet op beginscherm" om hem als app te gebruiken.

Alleen een wijziging in de code zorgt voor een nieuwe publicatie. Een nieuw hoofdstuk niet.

## Een hoofdstuk toevoegen

1. Stuur foto's van het hoofdstuk naar Claude.
2. Claude schrijft `public/chapters/chNN.json` (enkelvoudige zelfstandige naamwoorden altijd met *un/une*, woorden die alleen in het meervoud bestaan met *des*).
3. Claude zet het bestand in `public/chapters/index.json`, draait `npm run check-chapters`, commit en pusht.

Het hoofdstuk is binnen ongeveer 5 minuten live, zonder dat de app opnieuw gepubliceerd wordt: de app leest de hoofdstukken rechtstreeks uit de repo.

## Goed om te weten

- Haal `ch00.json` (het voorbeeldhoofdstuk) uit `index.json` zodra de echte hoofdstukken erin staan.
- Ids in een hoofdstuk mogen nooit veranderen en worden nooit hergebruikt, anders klopt de voortgang niet meer.
