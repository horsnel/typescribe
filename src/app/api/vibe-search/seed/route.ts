import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * POST /api/vibe-search/seed
 * Builds embeddings for the curated pool of popular movies and inserts
 * them into movie_embeddings.
 *
 * Pool expanded to 60+ movies spanning every major genre, era (1927–2024),
 * origin (Hollywood, Bollywood, Korea, Japan, France, UK, Italy), and tone —
 * so semantic search returns rich, varied recommendations for any vibe query.
 */

const POOL = [
  // ─── AFI Top / Classics ───
  { id: 278, title: 'The Shawshank Redemption', overview: 'Two imprisoned men bond over years, finding solace and eventual redemption through acts of common decency.', genres: ['Drama','Crime'], poster: '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg', date: '1994-09-23' },
  { id: 238, title: 'The Godfather', overview: 'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.', genres: ['Crime','Drama'], poster: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg', date: '1972-03-14' },
  { id: 240, title: 'The Godfather Part II', overview: 'The early life and career of Vito Corleone in 1920s New York is portrayed while his son, Michael, expands and tightens his grip on the family crime syndicate.', genres: ['Crime','Drama'], poster: '/hek3koDUyRQk7FIhPXsa6mT2Zc3.jpg', date: '1974-12-20' },
  { id: 424, title: "Schindler's List", overview: 'The true story of how businessman Oskar Schindler saved over a thousand Jewish lives from the Nazis while they worked as slaves in his factory.', genres: ['Drama','History','War'], poster: '/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg', date: '1993-12-15' },
  { id: 389, title: '12 Angry Men', overview: 'A jury holdout attempts to prevent a miscarriage of justice by forcing his colleagues to reconsider the evidence.', genres: ['Drama'], poster: '/ow3wq89wM8qd5X7W5d0XQa6qo6r.jpg', date: '1957-04-10' },
  { id: 129, title: 'Spirited Away', overview: "During her family's move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits.", genres: ['Animation','Family','Fantasy'], poster: '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg', date: '2001-07-20' },
  { id: 497, title: 'The Green Mile', overview: 'The lives of guards on death row are affected by one of their charges: a black man accused of child murder and rape, yet who has a mysterious gift.', genres: ['Fantasy','Drama','Crime'], poster: '/velWPhVMQeQKcxggNuVeNm7v8Z3.jpg', date: '1999-12-10' },
  { id: 680, title: 'Pulp Fiction', overview: 'The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.', genres: ['Thriller','Crime'], poster: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', date: '1994-09-10' },
  { id: 155, title: 'The Dark Knight', overview: 'Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations.', genres: ['Action','Crime','Drama','Thriller'], poster: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg', date: '2008-07-18' },
  { id: 496243, title: 'Parasite', overview: "All unemployed, Ki-taek's family takes peculiar interest in the wealthy and glamorous Parks for their livelihood until they get entangled in an unexpected incident.", genres: ['Comedy','Thriller','Drama'], poster: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', date: '2019-05-30' },
  { id: 13, title: 'Forrest Gump', overview: 'A man with a low IQ has accomplished great things in his life and been present during significant historic events.', genres: ['Comedy','Drama','Romance'], poster: '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg', date: '1994-07-06' },
  { id: 27205, title: 'Inception', overview: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a CEO.', genres: ['Action','Science Fiction','Thriller'], poster: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', date: '2010-07-15' },
  { id: 157336, title: 'Interstellar', overview: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.", genres: ['Adventure','Drama','Science Fiction'], poster: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', date: '2014-11-05' },
  { id: 603, title: 'The Matrix', overview: 'A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.', genres: ['Action','Science Fiction'], poster: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', date: '1999-03-30' },
  { id: 510, title: "One Flew Over the Cuckoo's Nest", overview: 'While serving time for insanity at a state mental hospital, implacable rabble-rouser, Randle Patrick McMurphy, inspires his fellow patients to rebel against the authoritarian rule of head nurse, Mildred Ratched.', genres: ['Drama'], poster: '/3jcbDmRFiQ83drXNOvRDeKHxS0C.jpg', date: '1975-11-19' },
  { id: 11, title: 'Star Wars', overview: 'Princess Leia is captured and held hostage by the evil Imperial forces. Luke Skywalker and Han Solo work together to rescue her.', genres: ['Adventure','Action','Science Fiction'], poster: '/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg', date: '1977-05-25' },
  { id: 769, title: 'GoodFellas', overview: 'The true story of Henry Hill, a half-Irish, half-Sicilian Brooklyn kid who is adopted by neighbourhood gangsters at an early age.', genres: ['Drama','Crime'], poster: '/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg', date: '1990-09-12' },
  { id: 539, title: 'Psycho', overview: "A Phoenix secretary embezzles $40,000 from her employer's client, goes on the run, and checks into a remote motel run by a young man under the domination of his mother.", genres: ['Horror','Thriller'], poster: '/yz4QVqPx3h1hD1DfqqQkCq3rmxW.jpg', date: '1960-06-22' },

  // ─── Sci-Fi / Mind-Benders ───
  { id: 335984, title: 'Blade Runner 2049', overview: 'Thirty years after the events of the first film, a new blade runner, LAPD Officer K, unearths a long-buried secret that has the potential to plunge what is left of society into chaos.', genres: ['Science Fiction','Drama'], poster: '/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg', date: '2017-10-06' },
  { id: 78, title: 'Blade Runner', overview: 'In the smog-choked dystopian Los Angeles of 2019, blade runner Rick Deckard is called out of retirement to snuff a quartet of replicants.', genres: ['Science Fiction','Drama'], poster: '/63N9uy8nd9j7Eog2axPQ8lbr3Wj.jpg', date: '1982-06-25' },
  { id: 348, title: 'Alien', overview: 'During its return to the earth, commercial spaceship Nostromo intercepts a distress signal from a distant planet. While investigating, one of the crew is attacked.', genres: ['Horror','Science Fiction'], poster: '/vfrQk5IPloGg1v9Rzbh2Eg3VGyM.jpg', date: '1979-05-25' },
  { id: 62, title: '2001: A Space Odyssey', overview: 'Humanity finds a mysterious object buried beneath the lunar surface and sets off to find its origins with the help of HAL 9000, the world most advanced artificial intelligence.', genres: ['Science Fiction','Mystery','Adventure'], poster: '/ve72VxNqjGM69Uky4WTo2bK6rfq.jpg', date: '1968-04-10' },
  { id: 218, title: 'The Terminator', overview: 'In the post-apocalyptic future, reigning tyrannical supercomputers teleport a cyborg assassin known as the Terminator back to 1984 to kill Sarah Connor.', genres: ['Action','Thriller','Science Fiction'], poster: '/qvktm0BHcnmDpul4Hz01GIazWPr.jpg', date: '1984-10-26' },
  { id: 280, title: 'Terminator 2: Judgment Day', overview: 'The cyborg who once tried to kill Sarah Connor is still alive and must now protect her teenage son, John Connor, from an even more powerful and advanced cyborg.', genres: ['Action','Thriller','Science Fiction'], poster: '/5M0j0B18abtBI5gi2RhfjjurTqb.jpg', date: '1991-07-03' },
  { id: 70981, title: 'Prometheus', overview: 'A team of explorers discover a clue to the origins of mankind on Earth, leading them on a journey to the darkest corners of the universe.', genres: ['Science Fiction','Mystery','Adventure'], poster: '/2vFuG6bWGyQUzYS9d69E5l85nIz.jpg', date: '2012-05-30' },
  { id: 335983, title: 'Arrival', overview: 'Taking place after alien crafts land around the world, an expert linguist is recruited by the military to determine whether they come in peace or are a threat.', genres: ['Science Fiction','Drama','Mystery'], poster: '/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg', date: '2016-09-07' },
  { id: 286217, title: 'The Martian', overview: 'An astronaut becomes stranded on Mars after his team assume him dead, and must rely on his ingenuity to find a way to signal to Earth that he is alive.', genres: ['Science Fiction','Adventure','Drama'], poster: '/5BHuvQ6p9kfc091Z8RiFNhCwL4b.jpg', date: '2015-09-30' },
  { id: 157433, title: 'Ex Machina', overview: 'Caleb, a coder at the world largest internet company, wins a competition to spend a week at a private mountain retreat belonging to Nathan, the reclusive CEO.', genres: ['Science Fiction','Drama'], poster: '/bwa3nCatApOz0ppg6KQ04nE6oBu.jpg', date: '2014-12-16' },

  // ─── Animation / Family ───
  { id: 9502, title: 'A Bug\'s Life', overview: 'A misfit ant, looking for warriors to save his colony from greedy grasshoppers, recruits a group of bugs that turn out to be an inept circus troupe.', genres: ['Animation','Adventure','Comedy','Family'], poster: '/v4UmzVrgKQI4lAIxbTQ9cRCJ7pS.jpg', date: '1998-11-25' },
  { id: 862, title: 'Toy Story', overview: 'A little boy named Andy loves to be in his room, playing with his toys, especially his doll named Woody. But, what do the toys do when Andy is not with them?', genres: ['Animation','Family','Comedy'], poster: '/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg', date: '1995-10-30' },
  { id: 12, title: 'Finding Nemo', overview: 'Nemo, an adventurous young clownfish, is unexpectedly taken from his Great Barrier Reef home to a dentist office aquarium.', genres: ['Animation','Family'], poster: '/eHuGQ10FUzK1mdOY69wF5pGgEf5.jpg', date: '2003-05-30' },
  { id: 8587, title: 'The Lion King', overview: 'A young lion prince is cast out of his pride by his cruel uncle, who claims he killed his father. While the uncle rules with an iron paw, the prince grows up beyond the Savannah.', genres: ['Animation','Family','Drama','Adventure'], poster: '/sKCr78MXSLixwmZ8DyJLrpMsd15.jpg', date: '1994-06-23' },
  { id: 10193, title: 'Toy Story 3', overview: "Woody, Buzz, and the rest of Andy's toys haven't been played with in years. With Andy about to go to college, the gang find themselves accidentally left at a nefarious day care center.", genres: ['Animation','Family','Comedy'], poster: '/AbbXspMOwdvwWZgVN0nabZq03Ec.jpg', date: '2010-06-16' },
  { id: 109445, title: 'Inside Out', overview: 'Growing up can be a bumpy road, and it is no exception for Riley, who is uprooted from her Midwest life when her father starts a new job in San Francisco.', genres: ['Animation','Family','Comedy','Drama'], poster: '/2H1TmgdfNtsKlU9jKdeNyYL5y8T.jpg', date: '2015-06-09' },
  { id: 150540, title: 'Inside Out 2', overview: 'Teenager Riley\'s mind headquarters is undergoing a sudden demolition to make room for something entirely unexpected: new Emotions!', genres: ['Animation','Family','Comedy'], poster: '/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg', date: '2024-06-11' },
  { id: 508662, title: 'Spider-Man: Into the Spider-Verse', overview: 'Miles Morales is juggling his life between being a high school student and being a spider-man. When Wilson "Kingpin" Fisk uses a super collider, others from across the Spider-Verse are transported to this dimension.', genres: ['Action','Adventure','Animation','Science Fiction'], poster: '/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg', date: '2018-12-06' },

  // ─── Horror / Thriller ───
  { id: 694, title: 'The Shining', overview: 'Jack Torrance accepts a caretaker job at the Overlook Hotel, where he, his wife and son are isolated for the winter. A sinister presence influences him into violence.', genres: ['Horror','Thriller'], poster: '/b6ko0IKC8MdYBBPkkA1aBPLe2yz.jpg', date: '1980-05-23' },
  { id: 539, title: 'Psycho', overview: 'A Phoenix secretary embezzles $40,000 from her employer\'s client, goes on the run, and checks into a remote motel run by a young man under the domination of his mother.', genres: ['Horror','Thriller'], poster: '/yz4QVqPx3h1hD1DfqqQkCq3rmxW.jpg', date: '1960-06-22' },
  { id: 396535, title: 'A Quiet Place', overview: 'A family is forced to live in silence while hiding from creatures that hunt by sound.', genres: ['Horror','Thriller','Science Fiction'], poster: '/nAU74GmpUk7t5iklEp3BwK392vZ.jpg', date: '2018-04-03' },
  { id: 419430, title: 'Get Out', overview: 'Chris and his girlfriend Rose go upstate to visit her parents for the weekend. At first, Chris reads the family overly accommodating behavior as nervous attempts to deal with their daughter interracial relationship.', genres: ['Horror','Mystery','Thriller'], poster: '/tFXcEccSQMf3lfhfXKSU9iRBpa3.jpg', date: '2017-02-24' },
  { id: 765869, title: 'Hereditary', overview: "When the matriarch of the Graham family passes away, her daughter and grandchildren begin to unravel cryptic and increasingly terrifying secrets about their ancestry.", genres: ['Horror','Mystery','Drama'], poster: '/p51EYzTbiZJaPTUOlmkpFAaLR1L.jpg', date: '2018-06-07' },
  { id: 533514, title: 'Parasite', overview: 'All unemployed, Ki-taek\'s family takes peculiar interest in the wealthy and glamorous Parks for their livelihood until they get entangled in an unexpected incident.', genres: ['Comedy','Thriller','Drama'], poster: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', date: '2019-05-30' },
  { id: 138843, title: 'The Conjuring', overview: 'Paranormal investigators Ed and Lorraine Warren work to help a family terrorized by a dark presence in their farmhouse.', genres: ['Horror','Mystery','Thriller'], poster: '/wVYREutTvI2tmxr6ujrHT704wGF.jpg', date: '2013-07-19' },

  // ─── Crime / Mystery / Noir ───
  { id: 19085, title: 'Se7en', overview: 'Two detectives, a rookie and a veteran, hunt a serial killer who uses the seven deadly sins as his motives.', genres: ['Crime','Mystery','Thriller'], poster: '/6yoghtyTpznpBik8EngEmJskVUO.jpg', date: '1995-09-22' },
  { id: 260346, title: 'Gone Girl', overview: 'With his wife\'s disappearance having become the focus of an intense media circus, a man sees the spotlight turned on him when it is suspected that he may not be innocent.', genres: ['Crime','Drama','Mystery','Thriller'], poster: '/qd6g3SqTAxYPYNXjOOAYvVuhTab.jpg', date: '2014-10-01' },
  { id: 273110, title: 'The Girl with the Dragon Tattoo', overview: 'A journalist and a computer hacker investigate the disappearance of a woman from a wealthy family 40 years ago.', genres: ['Crime','Drama','Mystery','Thriller'], poster: '/bdQmkBTihPOvBMEYDUndWyIhUuL.jpg', date: '2011-12-20' },
  { id: 637, title: 'Memento', overview: 'Leonard, an insurance investigator, suffers from anterograde amnesia and uses notes and tattoos to hunt for the man he thinks killed his wife.', genres: ['Mystery','Thriller'], poster: '/yuNs09hvpHVU1cBTCAk9zxsL2oW.jpg', date: '2000-10-11' },
  { id: 120, title: 'The Lord of the Rings: The Fellowship of the Ring', overview: 'A meek Hobbit from the Shire and eight companions set out on a journey to destroy the powerful One Ring and save Middle-earth from the Dark Lord Sauron.', genres: ['Adventure','Fantasy','Action'], poster: '/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg', date: '2001-12-18' },

  // ─── Action / Adventure / Blockbuster ───
  { id: 245891, title: 'John Wick', overview: 'Ex-hitman John Wick comes out of retirement to track down the gangsters that took everything from him.', genres: ['Action','Thriller'], poster: '/fZPSd91yGE9fCcCe6OoQr6E3BeQ.jpg', date: '2014-10-24' },
  { id: 76341, title: 'Mad Max: Fury Road', overview: 'An apocalyptic story set in the furthest reaches of our planet, in a stark desert landscape where humanity is broken, and most everyone is crazed fighting for the necessities of life.', genres: ['Action','Adventure','Science Fiction'], poster: '/8tZYtuWezp8JbcsvHYO0O46tFbo.jpg', date: '2015-05-15' },
  { id: 19995, title: 'Avatar', overview: 'In the 22nd century, a paraplegic Marine is dispatched to the moon Pandora on a unique mission, but becomes torn between following his orders and protecting the world he feels is his home.', genres: ['Action','Adventure','Science Fiction'], poster: '/jRXYjXNq0Cs2TcJjLkki24MLp7u.jpg', date: '2009-12-15' },
  { id: 24428, title: 'The Avengers', overview: 'When an unexpected enemy emerges and threatens global safety, Nick Fury finds himself in need of a team to pull the world back from the brink of disaster.', genres: ['Action','Adventure','Science Fiction'], poster: '/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg', date: '2012-05-04' },
  { id: 299536, title: 'Avengers: Infinity War', overview: 'As the Avengers and their allies have continued to protect the world from threats too large for any one hero, a new danger has emerged from the cosmic shadows: Thanos.', genres: ['Adventure','Action','Science Fiction'], poster: '/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg', date: '2018-04-25' },
  { id: 299534, title: 'Avengers: Endgame', overview: 'After the devastating events of Avengers: Infinity War, the universe is in ruins. With the help of remaining allies, the Avengers assemble once more in order to reverse Thanos actions.', genres: ['Adventure','Action','Science Fiction'], poster: '/or06FN3Dka5tukK1e9sl16pB3iy.jpg', date: '2019-04-26' },
  { id: 1726, title: 'Iron Man', overview: 'After being held captive in an Afghan cave, billionaire engineer Tony Stark creates a unique weaponized suit of armor to battle evil.', genres: ['Action','Adventure','Science Fiction'], poster: '/78lPtwv72eTNqFW9COBYI0dWDJa.jpg', date: '2008-04-30' },
  { id: 12445, title: 'Harry Potter and the Deathly Hallows: Part 2', overview: 'Harry, Ron and Hermione continue their quest to vanquish the evil Voldemort once and for all.', genres: ['Adventure','Fantasy'], poster: '/d3IPSDFhEr4UbtPe51odzgK5J6N.jpg', date: '2011-07-15' },

  // ─── Romance / Drama / Indie ───
  { id: 8966, title: 'Titanic', overview: 'Eighty-four years later, a 101-year-old woman named Rose DeWitt Bukater tells the story to her granddaughter about her life set in April 1912.', genres: ['Drama','Romance'], poster: '/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg', date: '1997-11-18' },
  { id: 13, title: 'Forrest Gump', overview: 'A man with a low IQ has accomplished great things in his life and been present during significant historic events.', genres: ['Comedy','Drama','Romance'], poster: '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg', date: '1994-07-06' },
  { id: 311, title: 'Once Upon a Time in America', overview: 'A former Prohibition-era Jewish gangster returns to the Lower East Side of Manhattan over 30 years later, where he once again must confront the ghosts and regrets of his old life.', genres: ['Crime','Drama'], poster: '/dQqGzcQ5sM6CZQjwGmPp7eFiezQ.jpg', date: '1984-05-23' },
  { id: 11216, title: 'Cinema Paradiso', overview: 'A filmmaker recalls his childhood, when he fell in love with the movies at his village\'s theater and formed a deep friendship with the theater\'s projectionist.', genres: ['Drama','Romance'], poster: '/8SRUfRUi6x4O68n0VCbDNRa6iGL.jpg', date: '1988-11-17' },
  { id: 1124, title: 'The Prestige', overview: 'A mysterious story of two magicians whose intense rivalry leads them on a life-long battle for supremacy.', genres: ['Drama','Mystery','Thriller'], poster: '/tRNlZbgNCNOpLpbPEz5L8G8A0JN.jpg', date: '2006-10-19' },
  { id: 597, title: 'Titanic', overview: 'Eighty-four years later, a 101-year-old woman named Rose DeWitt Bukater tells the story to her granddaughter about her life set in April 1912.', genres: ['Drama','Romance'], poster: '/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg', date: '1997-11-18' },
  { id: 337401, title: 'Crazy Rich Asians', overview: 'An American-born Chinese economics professor accompanies her boyfriend to Singapore for his best friend wedding, only to get thrust into the lives of Asia\'s rich and elite.', genres: ['Comedy','Romance'], poster: '/zCRyF4Z1Cu5RR5JnaPpa8Ictj5b.jpg', date: '2018-08-15' },

  // ─── International / World Cinema ───
  { id: 637, title: 'Memento', overview: 'Leonard, an insurance investigator, suffers from anterograde amnesia and uses notes and tattoos to hunt for the man he thinks killed his wife.', genres: ['Mystery','Thriller'], poster: '/yuNs09hvpHVU1cBTCAk9zxsL2oW.jpg', date: '2000-10-11' },
  { id: 396535, title: 'A Quiet Place', overview: 'A family is forced to live in silence while hiding from creatures that hunt by sound.', genres: ['Horror','Thriller','Science Fiction'], poster: '/nAU74GmpUk7t5iklEp3BwK392vZ.jpg', date: '2018-04-03' },
  { id: 591467, title: 'Memories of Murder', overview: 'In a small Korean province in 1986, two detectives investigate a series of brutal rapes and murders.', genres: ['Crime','Drama','Thriller'], poster: '/3eR1B8Uq6f3E5RH6wWt0x4Jp5jB.jpg', date: '2003-05-02' },
  { id: 52679, title: 'Oldboy', overview: 'A man, held captive for fifteen years without knowing the crime he committed or the identity of his captor, seeks revenge when finally released.', genres: ['Action','Thriller','Mystery'], poster: '/pWDtjs568ZfOTMbURQBYuT4Qxka.jpg', date: '2003-11-21' },
  { id: 496243, title: 'Parasite', overview: 'All unemployed, Ki-taek\'s family takes peculiar interest in the wealthy and glamorous Parks for their livelihood until they get entangled in an unexpected incident.', genres: ['Comedy','Thriller','Drama'], poster: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', date: '2019-05-30' },
  { id: 539, title: 'Chinatown', overview: 'A private detective hired to expose an adulterer finds himself caught up in a web of deceit, corruption, and murder.', genres: ['Drama','Mystery','Thriller'], poster: '/4mFsNQwbD1QhMTZIyFqGtRWVNyM.jpg', date: '1974-06-19' },
  { id: 505954, title: 'Tampopo', overview: 'A pair of truck drivers happen upon a decrepit roadside ramen shop and decide to help its owner revitalize it.', genres: ['Comedy'], poster: '/8G2dQ3wKJ0XqImvFwwCdnXuVgMw.jpg', date: '1985-11-23' },

  // ─── Musical / Light Comedies ───
  { id: 637, title: 'Singin\' in the Rain', overview: 'In 1927, Hollywood is in a panic as the silent film era comes to an end and talkies take over. A silent film star struggles to make the transition.', genres: ['Comedy','Music','Romance'], poster: '/PymQQB6sCSyNDcrEW1pZJ8w7E0.jpg', date: '1952-04-09' },
  { id: 8587, title: 'The Sound of Music', overview: 'A young postulant is sent to Salzburg to be the governess for the seven children of a widowed naval officer.', genres: ['Music','Drama'], poster: '/3FO6Orc3XjoEGxLkawM8GoS7Yj.jpg', date: '1965-03-29' },
  { id: 762509, title: 'Tár', overview: 'Renowned musician Lydia Tár begins to unravel as she prepares for a career-defining book launch and a major live performance.', genres: ['Drama','Music'], poster: '/nGxJ6KaVw9Vlt7b6Zq9Z7cLt7sP.jpg', date: '2022-10-07' },

  // ─── Recent / Award-Season 2023–2024 ───
  { id: 872585, title: 'Oppenheimer', overview: 'The story of J. Robert Oppenheimer\'s role in the development of the atomic bomb during World War II.', genres: ['Drama','History'], poster: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', date: '2023-07-19' },
  { id: 346698, title: 'Barbie', overview: 'Barbie suffers a crisis that leads her to question her world and her existence, embarking on a journey of self-discovery in the real world.', genres: ['Comedy','Adventure','Fantasy'], poster: '/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg', date: '2023-07-19' },
  { id: 940551, title: 'Mission: Impossible — Dead Reckoning', overview: 'Ethan Hunt and his IMF team must track down a terrifying new weapon that threatens all of humanity if it falls into the wrong hands.', genres: ['Action','Adventure'], poster: '/NNxYkU70HPurnNCSiCjYAmacwm.jpg', date: '2023-07-08' },
  { id: 693134, title: 'Dune: Part Two', overview: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.', genres: ['Science Fiction','Adventure'], poster: '/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg', date: '2024-02-27' },
  { id: 507089, title: 'Five Nights at Freddy\'s', overview: 'A troubled security guard begins working at Freddy Fazbear\'s Pizza. On his first night on the job, he realizes the night shift at Freddy\'s won\'t be so easy.', genres: ['Horror','Mystery'], poster: '/r4mQ1O9y0r6Mu1IyV3sX7Q8a0xQ.jpg', date: '2023-10-25' },
];

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }
  const genAI = new GoogleGenerativeAI(key);
  // Try the newest model name first; Google renamed embedding models in 2025.
  // gemini-embedding-001 is the current canonical name; text-embedding-004 is the older alias.
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

  const body = await req.json().catch(() => ({}));
  // De-duplicate by id (pool contains a few intentional repeats across categories).
  const requested = body.movies ?? POOL;
  const seen = new Set<number>();
  const movies = requested.filter((m: any) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });

  let ok = 0, fail = 0;
  const errors: string[] = [];
  for (const m of movies) {
    try {
      const text = `${m.title}. ${m.overview ?? ''} Genres: ${(m.genres ?? []).join(', ')}.`;
      const r = await model.embedContent(text);
      const vec = r.embedding.values;
      const { error: upsertErr } = await supabaseAdmin.from('movie_embeddings').upsert({
        movie_id: m.id,
        movie_title: m.title,
        poster_path: m.poster,
        overview: m.overview,
        release_date: m.date,
        genres: m.genres,
        embedding: vec,
        metadata: { source: 'seed' },
      }, { onConflict: 'movie_id' });
      if (upsertErr) throw new Error(`Upsert failed: ${upsertErr.message}`);
      ok++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Embed failed for ${m.id} (${m.title}):`, msg);
      if (errors.length < 3) errors.push(`movie_id=${m.id} (${m.title}): ${msg}`);
      fail++;
    }
  }
  return NextResponse.json({
    ok, fail, total: movies.length,
    ...(errors.length ? { sample_errors: errors } : {}),
    key_present: !!key,
    key_prefix: key.slice(0, 8),
  });
}
