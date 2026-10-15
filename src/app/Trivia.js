import styles from './page.module.css';

// Facts about Laramie and Albany County, shown one at a time while people wait.
// Mostly from Wikipedia (Laramie, Albany County, University of Wyoming, Louisa Swain,
// Eliza Stewart Boyd, Women's suffrage in Wyoming and others), WyoHistory.org, and
// Wyoming statutes. Mixed up by topic so similar facts don't run back to back.
// Every eleventh or so is a beaver fact, for our mascot.
const FACTS = [
  'On September 6, 1870, 69-year-old Louisa Swain of Laramie became the first woman in the U.S. to cast a legal vote in a general election.',
  'Laramie sits at about 7,165 feet above sea level. That’s higher than Denver’s Mile High by more than 1,800 feet.',
  'Albany County is a presidential bellwether: it has backed the losing candidate only four times, in 1892, 1960, 1976 and 2012.',
  'Laramie is named for Jacques La Ramée, a French-Canadian fur trapper who disappeared in the nearby mountains in the early 1820s.',
  'Laramie’s city council has nine members, three from each of the city’s three wards, serving overlapping four-year terms.',
  'The University of Wyoming was founded in 1886, four years before Wyoming became a state. It opened in 1887 with 42 students.',
  'In March 1870, Laramie women became the first women in the world to serve on a jury.',
  'The Laramie River flows north. It starts in Colorado and runs about 280 miles, through Laramie, to meet the North Platte River.',
  'Laramie’s mayor isn’t elected directly. Every two years, the city council chooses a mayor and vice mayor from among its own members.',
  'Butch Cassidy served time in Laramie’s Wyoming Territorial Prison from 1894 to 1896. It’s now a state historic site.',
  'Beavers are North America’s largest rodent. A typical adult weighs about 44 pounds, and very old ones can top 100.',
  'In Wyoming you can register and vote on the same day, including on Election Day.',
  'The Ames Monument, a 60-foot granite pyramid east of Laramie, marks the highest point of the first transcontinental railroad: 8,247 feet.',
  'In 1910, Mary Godat Bellamy of Laramie became the first woman elected to the Wyoming Legislature.',
  'Vedauwoo’s name is often traced to an Arapaho word meaning “earth-born.” Its granite formations are about 1.4 billion years old.',
  'Albany County was named after Albany, New York, the capital of legislator Charles D. Bradley’s home state.',
  'Every vote counts: in 1910, Mary Bellamy finished just one vote behind Albany County’s top House vote-getter, 1,284 to 1,285.',
  'War Memorial Stadium in Laramie sits at about 7,220 feet, the highest stadium in major college football.',
  'In 1869, Wyoming Territory passed the first law in the U.S. giving women the right to vote. Hence the nickname “the Equality State.”',
  'Bill Nye founded the Laramie Boomerang newspaper in 1881 and named it after his mule, Boomerang.',
  'By state law, all municipal offices in Wyoming are nonpartisan. City council candidates appear on the ballot without a party label.',
  'From 1825 to 1840, fur trappers met at a yearly “rendezvous” to trade beaver pelts. Eleven of them were held in Wyoming.',
  'Laramie’s record low temperature is −50°F.',
  'Eliza Stewart Boyd, Laramie’s first public school teacher, was the first woman in America selected for jury service, in March 1870.',
  'The University of Wyoming’s location in Laramie is written into the state constitution.',
  'Albany County is one of only 13 counties in the country that voted for Obama in 2008, Romney in 2012, Trump in 2016 and Biden in 2020.',
  'The Union Pacific Railroad reached Laramie on May 4, 1868, and the town grew up almost overnight. Regular passenger service began six days later.',
  'Beavers have built dams right in town: in 2016, beavers dammed Spring Creek in Laramie’s LaPrele Park and were live-trapped and moved somewhere safer.',
  'Medicine Bow Peak in the Snowy Range rises to 12,018 feet, the highest point in southern Wyoming.',
  'Election night numbers are unofficial. Albany County’s canvassing board certifies the results by the Friday after the election.',
  'Laramie’s first mayor, M.C. Brown, resigned after about six weeks in office in 1868. He later witnessed Louisa Swain’s historic vote as a judge.',
  'When Congress balked at women’s suffrage, Wyoming legislators replied: “We will stay out of the Union a hundred years rather than come in without our women.”',
  'The endangered Wyoming toad is found only in the Laramie Basin. After nearly vanishing in the 1970s, it’s being brought back at Mortenson Lake National Wildlife Refuge.',
  'Beaver teeth are orange because their enamel contains iron, and they never stop growing.',
  'Laramie was the first town in Wyoming to hold a municipal election.',
  'Ken Sailors, a Laramie High graduate often credited with inventing the jump shot, led UW to the 1943 NCAA basketball championship.',
  'Wyoming school board races are nonpartisan too. A 2025 bill to put party labels on them passed the state Senate but died in the House.',
  'A giant bronze head of Abraham Lincoln, sculpted by UW art professor Robert Russin, watches over I-80 between Laramie and Cheyenne. It was dedicated in 1959.',
  'Albany County covers 4,309 square miles, bigger than Delaware and Rhode Island combined.',
  'Grace Raymond Hebard became UW’s first female trustee in 1891 and the first woman admitted to the Wyoming State Bar, in 1898.',
  'Prexy’s Pasture, the grassy heart of UW’s campus, is protected by a state law that bars most new buildings there. The football team played on it until 1922.',
  'In 2004, Laramie became the first city in Wyoming to ban smoking in enclosed workplaces, and voters upheld the ordinance.',
  'Fort Sanders, built south of Laramie in 1866, was first called Fort John Buford. Its 1869 stone guardhouse still stands.',
  'Congress recognized September 6, 2008, as Louisa Swain Day. A statue of her, “The Franchise,” stands outside the Wyoming House for Historic Women in Laramie.',
  'Before the fur trade there were an estimated 100–200 million beavers in North America. Today there are about 10–15 million.',
  'A town called Sherman grew up around the Ames Monument, then was abandoned after the railroad moved its tracks about three miles south in 1918.',
  'Laramie uses a council–manager government: the elected council sets policy and hires a city manager to run day-to-day operations.',
  'UW’s Old Main has a cornerstone laid in 1886 inscribed “Domi Habuit Unde Disceret,” roughly: “He need not go away from home for instruction.”',
  'In 1873, Eliza Stewart Boyd became the first woman in Wyoming nominated for the territorial legislature.',
  'Laramie Jubilee Days began in 1940 to celebrate Wyoming’s statehood day, July 10.',
  'Albany County School District #1 runs 19 schools spread across about 4,000 square miles.',
  'After the territorial prison closed, the University of Wyoming used it as a livestock experiment station until 1989.',
  'In 2024, Albany County’s presidential vote was decided by about 560 votes out of nearly 18,000. Local margins are thin!',
  'Laramie’s official motto is “Gem City of the Plains.”',
  'Mary Godat Bellamy was elected Albany County’s first woman superintendent of schools in 1902, eight years before she won a seat in the legislature.',
  'In one study, areas where beavers had returned held 160% more open water during droughts.',
  'Fully 21 Laramie sites are on the National Register of Historic Places, including the Wyoming Territorial Prison.',
  'The Albany County Clerk runs elections here, from mailing absentee ballots to posting the results you’re waiting for.',
  'Laramie was officially incorporated on January 13, 1874, about six years after the railroad arrived.',
  'In 1969, UW dismissed 14 Black football players, now known as the Black 14, who sought to wear black armbands in protest. The university formally apologized in 2019.',
  'Local ballots can include special districts, like conservation, fire and hospital districts, that fund services close to home.',
  'UW’s Geological Museum is home to “Big Al,” a famous Allosaurus that starred in a BBC documentary.',
  'Statewide and legislative results are certified by the State Canvassing Board: the governor, secretary of state, state auditor and state treasurer.',
  'More Wyoming landmarks are named for trapper Jacques La Ramée than for any other trapper except Jim Bridger.',
  'Write-in votes count! Every race has a line for writing in a name.',
  'UW’s White Hall is 12 stories tall, the second-tallest building in Wyoming.',
  'A beaver’s flat tail is an alarm system and a pantry: it slaps the water to warn of danger and stores fat for winter.',
];

const FACT_MS = 20 * 1000;

// A "Did you know?" block that shows a new fact every so often.
export default function Trivia({ now }) {
  const index = Math.floor(now / FACT_MS) % FACTS.length;
  return (
    <aside className={styles.trivia}>
      <p className={styles.triviaKicker}>Did you know?</p>
      <span key={`bar-${index}`} className={styles.triviaTimer} style={{ animationDuration: `${FACT_MS}ms` }} />
      {/* Keyed so each new fact fades in. */}
      <p key={index} className={styles.triviaFact}>
        {FACTS[index]}
      </p>
    </aside>
  );
}
