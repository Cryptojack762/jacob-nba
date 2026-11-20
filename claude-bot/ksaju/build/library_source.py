# K-Saju library content, one block per category (mirrors the LIB_* tabs in the Master Data sheet).
# Tradition entries are labelled "for reflection". Wellness entries were reworded 11/19 to remove treat/prevent/cure claims.
# Each entry: (title, content, source, label)
T="Tradition - for reflection"; E="Evidence summary - education only"
CATS = {
"saju_basics": ("Saju Basics", "tradition", [
 ("The Four Pillars (Saju Palja)", "Saju turns your birth year, month, day and hour into four 'pillars' made of eight characters. Traditionally it is read as a map of the moment you were born.", "Four Pillars of Destiny - Wikipedia; Gunghap: Understanding Korean Marital Compatibility & Saju", T),
 ("A tool for self-reflection", "Classical Saju study (Ziping) treats the chart as a personality framework for reflection, not a fixed fate. It is used to think about your tendencies and friction points.", "leekyuhaiambox-ops/saju-platform (GitHub)", T),
 ("True solar time", "Accurate charts adjust clock time to the sun's real position at your birth city (longitude and the equation of time). Near the edge of a two-hour block this can change the hour pillar.", "True Solar Time in Bazi: When Correction Changes a Pillar; BaziInsight hour pillar guide", "Calculation rule"),
 ("The Day Master", "The heavenly stem of your day pillar is called the Day Master and represents your core self. The rest of the chart is read in relation to it.", "How to Read Marital Harmony (Gunghap 3) - Korea Times; Saju Cafe in Seoul guide", T)]),
"five_elements": ("Five Elements & Obangsaek", "tradition", [
 ("The five elements (Ohaeng)", "East Asian tradition sorts the world into five phases: Wood, Fire, Earth, Metal and Water. Each is linked to seasons, directions, colors and personality pictures.", "Obangsaek: Korea's Five Color Philosophy in Daily Life", T),
 ("Feeding and controlling cycles", "In the feeding cycle Wood feeds Fire, Fire makes Earth, Earth bears Metal, Metal carries Water and Water feeds Wood. In the controlling cycle each element checks another, and balance between the two is the goal.", "Four Pillars of Destiny - Wikipedia; Gunghap guide", T),
 ("Obangsaek: Korea's five colors", "Korea's five traditional colors map to directions and seasons: blue-green East/spring, red South/summer, yellow center, white West/autumn and black North/winter. They appear in hanok homes, clothing and ceremonies.", "Obangsaek: Korea's Five Color Philosophy in Daily Life", T),
 ("Five-color food (Osaek)", "Korean cooking traditionally aims for five colors on the table, as in bibimbap. In practice it encourages a varied plate.", "Obangsaek: Korea's Five Color Philosophy in Daily Life", T)]),
"ten_stems": ("Ten Heavenly Stems", "tradition", [
 ("The ten stems", "The ten heavenly stems are yang and yin pairs of each element: Gap/Eul (Wood), Byeong/Jeong (Fire), Mu/Gi (Earth), Gyeong/Sin (Metal) and Im/Gye (Water). Stems are read as the 'heaven' or outward layer of a chart.", "How to Read Marital Harmony (Gunghap 3) - Korea Times", T),
 ("Stem combinations", "Some yang-yin stem pairs are said to 'combine', such as Gap Wood with Gi Earth. These pairs are read as natural affinity in a chart.", "How to Read Marital Harmony (Gunghap 3) - Korea Times", T),
 ("Yang and yin stems", "Yang stems are read as active and outward, yin stems as receptive and steady. The calendar alternates between them.", "Four Pillars of Destiny - Wikipedia", T),
 ("Gap Wood - yang wood", "Pictured as a tall tree with deep roots. Traditionally linked with ambition and principle, and sometimes stubbornness.", "Four Pillars of Destiny - Wikipedia; The Five Elements (Ohaeng) in Korean Culture", T),
 ("Eul Wood - yin wood", "Pictured as vines and flowers that bend and climb. Traditionally linked with gentleness, tact and resilience.", "Korea Times Gunghap 3; Four Pillars of Destiny - Wikipedia", T),
 ("Byeong Fire - yang fire", "Pictured as the sun. Traditionally linked with warmth, openness and charisma, and sometimes impulsiveness.", "Four Pillars of Destiny - Wikipedia; The Five Elements (Ohaeng) in Korean Culture", T),
 ("Jeong Fire - yin fire", "Pictured as a candle or hearth flame. Traditionally linked with thoughtfulness, attention and refinement.", "Korea Times Gunghap 3; Four Pillars of Destiny - Wikipedia", T),
 ("Mu Earth - yang earth", "Pictured as a mountain. Traditionally linked with steadiness, reliability and calm.", "Korea Times Gunghap 3; Four Pillars of Destiny - Wikipedia", T),
 ("Gi Earth - yin earth", "Pictured as garden soil. Traditionally linked with patience, practicality and caring for others.", "Korea Times Gunghap 3; Four Pillars of Destiny - Wikipedia", T),
 ("Gyeong Metal - yang metal", "Pictured as raw iron or a sword. Traditionally linked with courage, decisiveness and a strong sense of justice.", "Korea Times Gunghap 3; Four Pillars of Destiny - Wikipedia", T),
 ("Sin Metal - yin metal", "Pictured as polished gold or jewelry. Traditionally linked with precision, taste and high standards.", "Korea Times Gunghap 3; Four Pillars of Destiny - Wikipedia", T),
 ("Im Water - yang water", "Pictured as the ocean or a big river. Traditionally linked with resourcefulness and strategic thinking.", "Korea Times Gunghap 3; Four Pillars of Destiny - Wikipedia", T),
 ("Gye Water - yin water", "Pictured as rain or morning dew. Traditionally linked with intuition, sensitivity and quiet wisdom.", "Korea Times Gunghap 3; Four Pillars of Destiny - Wikipedia", T)]),
"twelve_branches": ("Twelve Earthly Branches", "tradition", [
 ("The twelve branches", "The twelve earthly branches split the day into twelve two-hour blocks and the year into twelve months. Branches are read as the 'earth' or practical layer of a chart.", "Korea Times Gunghap 3; Four Pillars of Destiny - Wikipedia", T),
 ("Combinations and clashes", "Branches can 'combine' or 'clash'. Readers use these to talk about change, tension and harmony.", "Korea Times Gunghap 3; Luck Pillars (dayun)", T),
 ("Hidden stems", "Each branch is said to hold 'hidden stems', secondary elements under the surface. They add detail to how a chart is read.", "Korea Times Gunghap 3; BaZi hour pillar guide", T),
 ("Ja - Rat (23:00-00:59)", "Water branch of midwinter (around December).", "BaziInsight hour pillar guide; Four Pillars of Destiny - Wikipedia", T),
 ("Chuk - Ox (01:00-02:59)", "Earth branch of late winter (around January).", "BaziInsight hour pillar guide; Four Pillars of Destiny - Wikipedia", T),
 ("In - Tiger (03:00-04:59)", "Wood branch of early spring (around February).", "BaziInsight hour pillar guide; Four Pillars of Destiny - Wikipedia", T),
 ("Myo - Rabbit (05:00-06:59)", "Wood branch of mid-spring (around March).", "Korea Times Gunghap 3; Four Pillars of Destiny - Wikipedia", T),
 ("Jin - Dragon (07:00-08:59)", "Earth branch of late spring (around April).", "Four Pillars of Destiny - Wikipedia", T),
 ("Sa - Snake (09:00-10:59)", "Fire branch of early summer (around May).", "Korea Times Gunghap 3; Four Pillars of Destiny - Wikipedia", T),
 ("O - Horse (11:00-12:59)", "Fire branch of midsummer (around June).", "Four Pillars of Destiny - Wikipedia", T),
 ("Mi - Goat (13:00-14:59)", "Earth branch of late summer (around July).", "Four Pillars of Destiny - Wikipedia", T),
 ("Sin - Monkey (15:00-16:59)", "Metal branch of early autumn (around August).", "BaziInsight hour pillar guide; Four Pillars of Destiny - Wikipedia", T),
 ("Yu - Rooster (17:00-18:59)", "Metal branch of mid-autumn (around September).", "BaziInsight hour pillar guide; Four Pillars of Destiny - Wikipedia", T),
 ("Sul - Dog (19:00-20:59)", "Earth branch of late autumn (around October).", "BaziInsight hour pillar guide; Four Pillars of Destiny - Wikipedia", T),
 ("Hae - Pig (21:00-22:59)", "Water branch of early winter (around November).", "BaziInsight hour pillar guide; Four Pillars of Destiny - Wikipedia", T)]),
"ten_gods": ("Ten Gods", "tradition", [
 ("What the Ten Gods are", "The Ten Gods describe how every other part of a chart relates to your Day Master. They group into five themes: support, peers, expression, wealth and authority.", "Four Pillars of Destiny - Wikipedia; Luck Pillars (dayun)", T),
 ("Direct vs indirect wealth", "Direct wealth is read as steady, planned earning. Indirect wealth is read as risk, sudden chances and ventures.", "Luck Pillars (dayun)", T),
 ("Hurting Officer", "The Hurting Officer is read as strong creativity and self-expression, sometimes pushing against authority. It is often linked with independent or artistic paths.", "Luck Pillars (dayun)", T)]),
"luck_pillars": ("Luck Pillars (Daeun)", "tradition", [
 ("10-year luck cycles", "Daeun are 10-year periods that step forward or back from your month pillar. Each decade is read as a different 'climate' for your chart.", "Four Pillars of Destiny - Wikipedia; Luck Pillars (dayun)", T),
 ("Helpful and unhelpful elements", "Readers ask whether a decade brings the element your chart needs for balance or one it already has too much of. Hard decades are read as times to move carefully, not as fixed bad luck.", "Luck Pillars (dayun)", T),
 ("The twelve-stage cycle", "Tradition describes a 12-stage life curve, from birth through peak to rest, that a stem moves through. It is used to talk about rising and falling energy over time.", "Luck Pillars (dayun)", T)]),
"solar_terms": ("24 Solar Terms", "tradition", [
 ("The 24 solar terms", "The year is split into 24 solar terms, one every 15 degrees of the sun's path. This is astronomy, and Saju uses it to set month pillars.", "24 Solar Terms in Bazi", "Astronomical fact"),
 ("Months start at solar terms", "In Saju a new month starts at a solar term, not on the 1st of the calendar month or at the new moon. Getting this time right matters for the month pillar.", "24 Solar Terms in Bazi; Four Pillars of Destiny - Wikipedia", "Calculation rule"),
 ("Ipchun starts the Saju year", "The Saju year begins at Ipchun (start of spring, around February 4), not at Lunar New Year. Births within a day of Ipchun need an exact time check.", "24 Solar Terms in Bazi; saju-platform (GitHub)", "Calculation rule")]),
"compatibility": ("Compatibility (Gunghap)", "tradition", [
 ("Outer and inner gunghap", "Outer gunghap compares birth years and animals. Inner gunghap compares day and hour pillars and is considered the deeper match.", "Gunghap: Understanding Korean Marital Compatibility & Saju", T),
 ("Balance, not sameness", "Gunghap looks for charts that balance each other, such as a 'cold' Metal-Water chart paired with a 'warm' Wood-Fire chart. Opposites are not read as a bad sign.", "Korea Times Gunghap 3; Gunghap guide", T),
 ("A conversation starter", "Many young Koreans use gunghap to talk about differences and how they communicate. Friction is treated as something to understand, not a verdict.", "Gunghap: Understanding Korean Marital Compatibility & Saju", "Cultural practice")]),
"sleep": ("Sleep", "wellness", [
 ("How sleep works", "Sleep cycles through stages called NREM and REM through the night. NHLBI notes many adults don't get enough sleep.", "Sleep Health - NHLBI (NIH)", E),
 ("Several short nights add up", "Research shows several nights of short sleep can affect attention, memory and mood. A regular sleep schedule helps.", "The consequences of sleep deprivation on cognitive performance - PMC", E),
 ("Sleep and the brain's cleanup", "Studies describe a 'glymphatic' system that clears waste from the brain during sleep. Researchers are still learning how this relates to long-term brain health.", "The consequences of sleep deprivation on cognitive performance - PMC", E)]),
"nutrition_herb_safety": ("Nutrition & Herb Safety", "wellness", [
 ("Herbs can interact with medicines", "Herbal supplements can interact with prescription drugs; for example St. John's wort can make some birth control and other medicines work less well. Always ask a doctor or pharmacist first.", "Herb-Drug Interactions - NCCIH (NIH)", E),
 ("Supplements aren't pre-approved", "In the US, dietary supplements don't need FDA approval for safety or effectiveness before sale. Quality and strength can vary between products.", "Herbal Supplements: Quality and Safety Concerns", E),
 ("Probiotics basics", "Probiotics are live microbes found in some foods and supplements; effects depend on the specific strain. NCCIH warns they can be risky for premature infants and people with weak immune systems.", "Probiotics: Usefulness and Safety - NCCIH (NIH)", E)]),
"mind_body": ("Mind-Body", "wellness", [
 ("Mindfulness programs", "Studies of mindfulness-based stress reduction (MBSR) have found people report less stress and anxiety. It is a learnable practice, not a replacement for care.", "Systematic Review for Medical Applications of Meditation - PMC", E),
 ("Meditation and the body", "Some studies link regular meditation with lower blood pressure and stress markers. Results vary, and it works best alongside medical advice.", "Meditation and Its Mental and Physical Health Benefits in 2023 - PMC", E),
 ("Yoga", "Research suggests yoga can help with flexibility, balance, sleep quality and some kinds of back discomfort. Start gently and check with a professional if you have pain or a condition.", "Yoga: Effectiveness and Safety - NCCIH (NIH)", E)]),
"oral_health": ("Oral Health", "wellness", [
 ("Your mouth's ecosystem", "The mouth is home to many microbes that form a natural film on teeth. When the balance is off, cavities and gum problems are more likely.", "Oral microbiology - Wikipedia", E),
 ("Gums and whole-body health", "Research links long-term gum inflammation with other health conditions. Daily brushing, cleaning between teeth and dental checkups matter.", "Oral microbiology - Wikipedia", E),
 ("Probiotics and gums", "Some early studies look at probiotics for gum health, but the evidence is mixed. Brushing and cleaning between teeth come first.", "Probiotics: Usefulness and Safety - NCCIH (NIH)", E)]),
"environment_home": ("Environment & Home", "wellness", [
 ("Indoor air can be dirtier than outside", "The EPA notes indoor air pollutant levels can be higher than outdoor levels. Controlling sources, airing out rooms and filtering air all help.", "An Office Building Occupant's Guide to Indoor Air Quality - EPA", E),
 ("Keep vents clear", "Blocked vents and unserviced systems reduce fresh air. Keep grilles clear and report stuffy rooms.", "An Office Building Occupant's Guide to Indoor Air Quality - EPA", E),
 ("Microplastics in indoor air", "A 2024 study measured tiny plastic particles in home and car air. Regular dusting, vacuuming and ventilation reduce indoor dust.", "Human exposure to PM10 microplastics in indoor air - PLOS One", E),
 ("New furniture and paint smells", "New furniture, paint and cleaners can release chemicals (VOCs) indoors. Choose low-emission products and air out rooms after renovating.", "An Office Building Occupant's Guide to Indoor Air Quality - EPA", E),
 ("Light and seasons at home", "Letting in natural daylight and fresh air supports a regular daily rhythm. Korea's five-color tradition also ties the home to the seasons.", "EPA Indoor Air Quality guide; Obangsaek guide", "Education + tradition")]),
"movement": ("Movement", "wellness", [
 ("Movement and the mind", "Regular physical activity is linked with better mood, focus and brain health as we age. Some activity is better than none.", "Yoga for Health: What the Science Says - NCCIH; Meditation benefits review - PMC", E),
 ("Balance practice", "Balance and posture exercises, like gentle yoga, can improve stability. NCCIH notes this may lower fall risk in older adults.", "Yoga for Health: What the Science Says - NCCIH (NIH)", E),
 ("Light movement and energy", "Reviews find light-to-moderate movement can help people feel less tired and sleep better. Start small and build up.", "Systematic Review for Medical Applications of Meditation - PMC", E),
 ("Mindful movement", "Moving slowly with attention, as in yoga or tai chi, can lower feelings of stress. It also builds body awareness.", "Yoga: Effectiveness and Safety - NCCIH (NIH)", E)]),
"stress_breathing": ("Stress & Breathing", "wellness", [
 ("Slow breathing", "Slow, deep breathing can calm the body's stress response and slow your heart rate. A few minutes is enough to try.", "Meditation benefits review 2023 - PMC; Systematic Review of Meditation RCTs - PMC", E),
 ("Mindfulness and stress markers", "Some trials found mindfulness programs lowered stress-related markers in the blood. The research is still growing.", "Meditation and Its Mental and Physical Health Benefits in 2023 - PMC", E),
 ("Meditation and mood", "Reviews show daily meditation can ease feelings of stress and anxiety for many people. If low mood lasts, talk to a professional; in a crisis call or text 988.", "Meditation and Mindfulness: Effectiveness and Safety - NCCIH; Meditation review 2023 - PMC", E),
 ("Stress and blood pressure", "Studies link stress-reduction practices with small drops in blood pressure. Keep following your doctor's plan.", "Meditation and Its Mental and Physical Health Benefits in 2023 - PMC", E)]),
"gut_health": ("Gut Health", "wellness", [
 ("Probiotics and the gut", "Probiotics may help some people's digestion, for example after antibiotics, but effects depend on the strain. Ask a doctor or pharmacist before starting one.", "Probiotics: Usefulness and Safety - NCCIH (NIH)", E),
 ("Who should be careful", "NCCIH and FDA warn probiotics can cause serious infections in premature infants and people with weak immune systems. Check with a doctor first.", "Probiotics: Usefulness and Safety - NCCIH (NIH)", E),
 ("Mouth to gut", "Stomach acid kills many swallowed mouth bacteria. Good oral care supports the whole digestive tract.", "Oral microbiology - Wikipedia", E),
 ("Fiber and gut variety", "Diets high in refined carbs are linked with less variety in gut microbes. Fiber-rich whole foods support a diverse gut.", "Oral microbiology - Wikipedia; MedlinePlus healthy eating", E)]),
"healthy_aging": ("Healthy Aging", "wellness", [
 ("Stress practices and cell aging", "Some studies link meditation with markers of healthy cell aging, such as telomere length. This research is early.", "Meditation and Its Mental and Physical Health Benefits in 2023 - PMC", E),
 ("Sleep and the aging brain", "Deep sleep helps the brain clear waste. Researchers are studying how long-term short sleep relates to memory as we age.", "The consequences of sleep deprivation on cognitive performance - PMC", E),
 ("Mind-body and stress genes", "Early research suggests mind-body practices may change how some stress-related genes are switched on. More study is needed.", "Meditation and Its Mental and Physical Health Benefits in 2023 - PMC", E),
 ("Green tea polyphenols", "Lab and population studies have looked at polyphenols in foods like green tea and memory. Results are mixed; enjoy them as part of a varied diet.", "The evidence for herbal and botanical remedies, Part 1", E)])}
