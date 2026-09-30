"""Hand-made test set: which headlines report the same incident.

Real headline wording from 29 Sep 2026 feeds where available; the second
report of each incident is written in the style of another outlet.
`group` is the expected incident; `xlang` marks cross-language reports that
only the multilingual model is expected to join.
"""
ARTICLES = [
    # Kathua firing
    dict(key="kathua_print", source="theprint", lang="en", hour=13, group="kathua",
         title="4 CISF personnel including officer killed as colleague opens fire in J&K’s Kathua",
         snippet="Incident took place around 6.40 pm Tuesday at the Sewa-II Hydroelectric Project unit in Kathua district, and accused has since been handed over to local police."),
    dict(key="kathua_ndtv", source="ndtv", lang="en", hour=14, group="kathua",
         title="CISF Head Constable Opens Fire At Colleagues In J&K's Kathua, 4 Killed",
         snippet="Four CISF personnel were shot dead by a Head Constable at the Sewa-II hydroelectric project unit in Kathua district of Jammu and Kashmir."),
    dict(key="kathua_ntv", source="ntvtelugu", lang="te", hour=15, group="kathua", xlang=True,
         title="Jammu Kashmir: CISF క్యాంపులో కలకలం..హెడ్ కానిస్టేబుల్ కాల్పుల్లో నలుగురు జవాన్లు మృతి",
         snippet="జమ్మూ కాశ్మీర్ కథువా జిల్లాలోని బసోలిలోని CISF క్యాంపులో సైనికుడు తన తోటి సైనికులపై కాల్పులు జరపడంతో నలుగురు సైనికులు మరణించారు."),
    # CM tour of Karimnagar and Sircilla
    dict(key="cm_ntv", source="ntvtelugu", lang="te", hour=9, group="cmtour",
         title="CM Revanth Reddy : రేపు సీఎం రేవంత్ టూర్.. కరీంనగర్, సిరిసిల్లలో భారీ కార్యక్రమాలు",
         snippet="తెలంగాణ ముఖ్యమంత్రి ఏ. రేవంత్ రెడ్డి రేపు కరీంనగర్, రాజన్న సిరిసిల్ల జిల్లాల్లో పర్యటించనున్నారు."),
    dict(key="cm_v6", source="v6velugu", lang="te", hour=11, group="cmtour",
         title="రేపు కరీంనగర్, సిరిసిల్లలో సీఎం రేవంత్ రెడ్డి పర్యటన",
         snippet="ముఖ్యమంత్రి రేవంత్ రెడ్డి రేపు కరీంనగర్, సిరిసిల్ల జిల్లాల్లో పర్యటిస్తారు. కలెక్టరేట్ ప్రారంభోత్సవం, బహిరంగ సభ."),
    # Alwal case
    dict(key="alwal_ntv", source="ntvtelugu", lang="te", hour=10, group="alwal",
         title="Alwal Case: అల్వాల్ మైనర్ బాలిక సామూహిక లైంగిక దాడి కేసులో షాకింగ్ ట్విస్ట్..",
         snippet="హైదరాబాద్‌లోని అల్వాల్‌లో మైనర్ యువతిపై జరిగిన సామూహిక లైంగిక దాడి కేసు దర్యాప్తులో దిగ్భ్రాంతికర విషయాలు."),
    dict(key="alwal_nt", source="namasthetelangana", lang="te", hour=12, group="alwal",
         title="అల్వాల్ మైనర్ బాలిక కేసు: 12 మంది నిందితులకు డ్రగ్స్ పాజిటివ్",
         snippet="అల్వాల్‌లో మైనర్ బాలికపై సామూహిక లైంగిక దాడి కేసులో అరెస్టయిన 12 మంది నిందితులకు డ్రగ్స్ పాజిటివ్."),
    # Record power demand
    dict(key="power_tt", source="telanganatoday", lang="en", hour=16, group="power",
         title="TGSPDCL records all-time high power demand of 12,044 MW",
         snippet="Electricity demand in the TGSPDCL area touched an all-time high of 12,044 MW at 3.52 pm on Tuesday."),
    dict(key="power_hindu", source="thehindu", lang="en", hour=18, group="power",
         title="Power demand in TGSPDCL area hits record 12,044 MW",
         snippet="The TGSPDCL recorded an all-time high power demand of 12,044 MW on Tuesday afternoon, surpassing the earlier record."),
    dict(key="power_ntv", source="ntvtelugu", lang="te", hour=17, group="power", xlang=True,
         title="TGSPDCL : విద్యుత్ డిమాండ్‌లో కొత్త రికార్డు.. 12,044 మెగావాట్లు.!",
         snippet="తెలంగాణ దక్షిణ విద్యుత్ పంపిణీ సంస్థ పరిధిలో విద్యుత్ డిమాండ్ ఆల్ టైమ్ గరిష్ట స్థాయికి చేరింది."),
    # Kohli centuries
    dict(key="kohli_ndtv", source="ndtv", lang="en", hour=8, group="kohli",
         title="Can Virat Kohli reach 100 international centuries? R Ashwin weighs in",
         snippet="R Ashwin said Virat Kohli reaching 100 international centuries before the 2027 World Cup is not impossible."),
    dict(key="kohli_hindu", source="thehindu", lang="en", hour=9, group="kohli",
         title="Ashwin says Virat Kohli can get to 100 international centuries",
         snippet="Former India spinner R Ashwin believes Virat Kohli can reach 100 international centuries before the 2027 World Cup."),
    # Unrelated single reports
    dict(key="delhi_slap", source="ndtv", lang="en", hour=7, group="slap",
         title="Delhi Minister, AAP MLA And Row That Began With Handshake And Ended With Slap",
         snippet="Parvesh Verma came for a road inspection in Tilak Nagar and then slapped an AAP MLA's assistant."),
    dict(key="delhi_air", source="hindustantimes", lang="en", hour=7, group="air",
         title="Delhi air quality slips to 'poor' as winds slow down",
         snippet="The air quality index in Delhi was recorded in the poor category on Tuesday morning as wind speeds dropped."),
    dict(key="flipkart", source="ntvtelugu", lang="te", hour=19, group="flipkart",
         title="Flipkart Sale: ఫ్లిప్‌కార్ట్ బిగ్ బిలియన్ డేస్ సేల్.. రూ.15 వేల లోపు లభించే కొత్త ఫోన్ల జాబితా",
         snippet="ఫ్లిప్‌కార్ట్ బిగ్ బిలియన్ డేస్ సేల్ త్వరలో ప్రారంభం కానుంది. 15 వేల రూపాయల కంటే తక్కువ ధరకే లభించే ఐదు స్మార్ట్‌ఫోన్లు."),
    dict(key="rrb", source="ndtv", lang="en", hour=9, group="rrb",
         title="Railway Recruitment Board Issues Notification For 1,688 Posts, Check Details",
         snippet="The application window will open on October 15, and the deadline to apply is November 13."),
    dict(key="lokayukta", source="ndtv", lang="en", hour=8, group="lokayukta",
         title="Maharashtra Approves Rs 1.32 Crore Luxury Cars For Lokayukta Amid Drought",
         snippet="A budget of Rs 33 lakh has been sanctioned per vehicle while Maharashtra has declared drought in 265 of its 358 talukas."),
    # World desk (synthetic test text): no Indian place -> international; naming one -> Indian scope
    dict(key="world_un", source="thehindu_world", lang="en", hour=10, group="world_un",
         title="UN General Assembly adopts resolution on ocean plastic pollution treaty",
         snippet="Member states at the United Nations voted in New York to open negotiations on a binding treaty."),
    dict(key="world_hyd", source="thehindu_world", lang="en", hour=11, group="world_hyd",
         title="Visiting Japanese delegation signs semiconductor pact in Hyderabad",
         snippet="The delegation met officials in Hyderabad to sign an agreement on chip design training."),
]

SOURCE_META = {
    "theprint": ("ThePrint", "national", "digital", "en", "India"),
    "ndtv": ("NDTV", "national", "tv_digital", "en", "India"),
    "thehindu": ("The Hindu", "national", "newspaper", "en", "India"),
    "hindustantimes": ("Hindustan Times", "national", "newspaper", "en", "India"),
    "ntvtelugu": ("NTV Telugu", "state", "tv", "te", "Telangana"),
    "v6velugu": ("V6 Velugu", "state", "tv_newspaper", "te", "Telangana"),
    "namasthetelangana": ("Namasthe Telangana", "state", "newspaper", "te", "Telangana"),
    "telanganatoday": ("Telangana Today", "state", "newspaper", "en", "Telangana"),
    "thehindu_world": ("The Hindu (World)", "international", "newspaper", "en", "World"),
}
