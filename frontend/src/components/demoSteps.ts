// Stappen voor de interactieve demo op de homepage. Schermen staan in public/demo/.
// x en y: het punt waar geklikt/getikt wordt, in procenten van het scherm.
// span: linker- en rechterrand van het gemarkeerde element, zodat de uitleg ernaast komt en niet eroverheen.
export type DemoStep = { img: string; x: number; y: number; span: [number, number]; title: string; text: string };

/** Eigenaar of manager in het dashboard (schermen van 1200x750). */
export const dashboardSteps: DemoStep[] = [
  { img: '/demo/stap-1.webp', x: 41.8, y: 66.5, span: [26.3, 57.5], title: 'Aandacht nodig', text: 'Vergeet iemand uit te klokken? Klokit zet het meteen bovenaan je overzicht.' },
  { img: '/demo/stap-2.webp', x: 62.8, y: 45.7, span: [59, 66.5], title: 'Afwijkingen in rood', text: 'Alle diensten van de week op servertijd. Twijfelgevallen zijn rood gemarkeerd.' },
  { img: '/demo/stap-3.webp', x: 63.8, y: 69.5, span: [59.5, 68], title: 'Correcties met geschiedenis', text: 'Bij elke correctie zie je wanneer iemand inklokte, hoe ver van de zaak en wat er is aangepast.' },
  { img: '/demo/stap-4.webp', x: 69.9, y: 45.6, span: [63.1, 76.8], title: 'Werkzone op de kaart', text: 'Zet een pin op je zaak en kies de straal. Alleen binnen deze cirkel kan je team inklokken.' },
  { img: '/demo/stap-5.webp', x: 71.9, y: 91.8, span: [63.6, 80.1], title: 'Nieuwe medewerkers', text: 'Medewerkers melden zich aan met jouw code. Jij bevestigt ze met één klik.' },
  { img: '/demo/stap-6.webp', x: 89, y: 10.8, span: [81.2, 96.6], title: 'Klaar voor de loonadministratie', text: 'Exporteer de uren van de week in één klik naar CSV, direct goed te openen in Excel.' },
];

/** Medewerker in de app (schermen van 390x844). */
export const appSteps: DemoStep[] = [
  { img: '/demo/app-1.webp', x: 50, y: 34.5, span: [9, 91], title: 'Inklokken met één tik', text: 'Je medewerker opent de app op de werkvloer en tikt op Inklokken.' },
  { img: '/demo/app-2.webp', x: 33.9, y: 43.2, span: [12.6, 55.3], title: 'Thuis inklokken lukt niet', text: 'Klokit checkt de GPS-locatie. Te ver van de zaak? Dan gaat het niet door, en ziet je medewerker meteen waarom.' },
  { img: '/demo/app-3.webp', x: 26.5, y: 46.1, span: [12.5, 40.4], title: 'Op locatie: gelukt', text: 'Binnen de straal staat de dienst er direct in, met tijd, afstand en GPS-nauwkeurigheid.' },
  { img: '/demo/app-4.webp', x: 50, y: 37.8, span: [9, 91], title: 'De dienst loopt', text: 'De teller loopt mee. Klaar met werken? Eén tik op Uitklokken.' },
  { img: '/demo/app-5.webp', x: 50, y: 80.6, span: [4.1, 95.9], title: 'Correctie aanvragen', text: 'Klopt een tijd niet? Je medewerker vraagt een correctie aan, en jij keurt hem goed in het dashboard.' },
];
