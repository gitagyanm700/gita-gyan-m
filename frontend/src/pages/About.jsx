import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Brain,
  Compass,
  Flame,
  Sparkles,
  Heart,
  Clock,
  Sun,
  Star,
  Flower2,
  CheckCircle2,
  Award,
  HelpCircle,
  X,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import "./About.css";

const FEATURES_DATA = [
  {
    id: "chapters",
    num: "01",
    category: "વાંચન & અધ્યયન",
    categoryHi: "पठन एवं अध्ययन",
    categoryEn: "Reading & Study",
    icon: BookOpen,
    iconColor: "#1a73e8",
    bgGlow: "rgba(26, 115, 232, 0.12)",
    badge: "સંપૂર્ણ જ્ઞાન",
    badgeHi: "सम्पूर्ण ज्ञान",
    badgeEn: "Complete Knowledge",
    title: "18 અધ્યાય અને 700 શ્લોક વાચન",
    titleHi: "18 अध्याय और 700 श्लोक पठन",
    titleEn: "18 Chapters & 700 Shlokas",
    description:
      "મૂળ સંસ્કૃત શ્લોકો, સચોટ અન્વય, શબ્દાર્થ, સરળ ગુજરાતી ભાવાર્થ અને તાત્પર્ય સાથે ઊંડાણપૂર્વક અભ્યાસ. વક્તા ઓળખ (શ્રીભગવાનુવાચ, અર્જુન ઉવાચ વગેરે) અને શ્લોક નેવિગેશન સુવિધા.",
    descriptionHi:
      "मूल संस्कृत श्लोक, सटीक अन्वय, शब्दार्थ, सरल हिंदी भावार्थ और तात्पर्य के साथ गहन अध्ययन। वक्ता परिचय (श्रीभगवानुवाच, अर्जुन उवाच आदि) और श्लोक नेविगेशन सुविधा।",
    descriptionEn:
      "In-depth study with authentic Sanskrit shlokas, word-by-word meanings, clear translations, and spiritual messages. Speaker identification and seamless navigation.",
    highlights: [
      "18 અધ્યાયોનું વ્યવસ્થિત વર્ગીકરણ",
      "સંસ્કૃત અન્વય અને શબ્દાર્થ સાથે શુદ્ધ અર્થ",
      "સરળ અને મધુર ગુજરાતી ભાવાર્થ",
      "શ્લોક નંબર અને અધ્યાય દ્વારા ત્વરિત નેવિગેશન",
    ],
    highlightsHi: [
      "18 अध्यायों का सुव्यवस्थित वर्गीकरण",
      "संस्कृत अन्वय और शब्दार्थ सहित शुद्ध अर्थ",
      "सरल और मधुर हिंदी भावार्थ",
      "श्लोक संख्या और अध्याय द्वारा त्वरित नेविगेशन",
    ],
    highlightsEn: [
      "Structured classification of all 18 chapters",
      "Word-by-word Sanskrit grammatical meanings",
      "Clear and authentic English translations",
      "Instant navigation by shloka and chapter",
    ],
    link: "/chapters",
    linkText: "18 અધ્યાય વાંચો",
    linkTextHi: "18 अध्याय पढ़ें",
    linkTextEn: "Read 18 Chapters",
  },
  {
    id: "ai",
    num: "02",
    category: "આધુનિક AI",
    categoryHi: "आधुनिक AI",
    categoryEn: "Modern AI",
    icon: Brain,
    iconColor: "#1a73e8",
    bgGlow: "rgba(26, 115, 232, 0.12)",
    badge: "Gemini AI",
    badgeHi: "Gemini AI",
    badgeEn: "Gemini AI",
    title: "ગીતા AI આધ્યાત્મિક સહાયક",
    titleHi: "गीता AI आध्यात्मिक सहायक",
    titleEn: "Gita AI Spiritual Assistant",
    description:
      "અત્યાધુનિક AI ટેકનોલોજી દ્વારા તમારા અંગત પ્રશ્નો, માનસિક મૂંઝવણો કે ધર્મ સંકટનું ભગવદ્ ગીતાના શ્લોકો અને શ્રીકૃષ્ણના ઉપદેશો આધારે તુરંત સચોટ સમાધાન.",
    descriptionHi:
      "अत्याधुनिक AI तकनीक द्वारा आपके व्यक्तिगत प्रश्नों, मानसिक उलझनों अथवा धर्म संकट का भगवद् गीता के श्लोकों और श्रीकृष्ण के उपदेशों के आधार पर तुरंत सटीक समाधान।",
    descriptionEn:
      "Ask life questions and get instant spiritual solutions and guidance directly grounded in the Bhagavad Gita and Lord Krishna's divine wisdom.",
    highlights: [
      "ગીતા આધારિત વ્યક્તિગત આધ્યાત્મિક માર્ગદર્શન",
      "સરળ અને મૈત્રીપૂર્ણ ગુજરાતીમાં વાતચીત",
      "શ્લોક સંદર્ભ સાથે પ્રમાણિત જવાબો",
      "ચેટ હિસ્ટ્રી અને 24/7 સતત ઉપલબ્ધતા",
    ],
    highlightsHi: [
      "गीता आधारित व्यक्तिगत आध्यात्मिक मार्गदर्शन",
      "सरल और मैत्रीपूर्ण हिंदी में वार्तालाप",
      "श्लोक संदर्भ सहित प्रामाणिक उत्तर",
      "चैट हिस्ट्री और 24/7 निरंतर उपलब्धता",
    ],
    highlightsEn: [
      "Personalized spiritual guidance based on Gita",
      "Conversations in Gujarati, Hindi and English",
      "Authoritative answers with shloka citations",
      "Chat history with 24/7 round-the-clock access",
    ],
    actionType: "ai",
    linkText: "ગીતા AI પૂછો",
    linkTextHi: "गीता AI से पूछें",
    linkTextEn: "Ask Gita AI",
  },
  {
    id: "guidance",
    num: "03",
    category: "જીવન વ્યવહાર",
    categoryHi: "जीवन व्यवहार",
    categoryEn: "Daily Life",
    icon: Compass,
    iconColor: "#1a73e8",
    bgGlow: "rgba(26, 115, 232, 0.12)",
    badge: "કૃષ્ણ વાણી",
    badgeHi: "कृष्ण वाणी",
    badgeEn: "Krishna Vani",
    title: "જીવન માર્ગદર્શન (Life Guidance)",
    titleHi: "जीवन मार्गदर्शन (Life Guidance)",
    titleEn: "Life Guidance",
    description:
      "આજના આધુનિક જીવનની મુખ્ય સમસ્યાઓ જેવી કે તણાવ, ક્રોધ, સંબંધો, નિર્ણયશક્તિ અને કર્મયોગ માટે ગીતાજીના સર્વોત્તમ શ્લોકોનું વ્યવહારિક સંકલન.",
    descriptionHi:
      "आज के आधुनिक जीवन की प्रमुख समस्याओं जैसे तनाव, क्रोध, संबंध, निर्णय-क्षमता और कर्मयोग के लिए गीता जी के सर्वोत्तम श्लोकों का व्यावहारिक संकलन।",
    descriptionEn:
      "Practical wisdom from the Bhagavad Gita for modern challenges: stress, anger management, relationships, focus, and karma yoga.",
    highlights: [
      "ચિંતા, ડિપ્રેશન અને તણાવ નિવારણ",
      "ક્રોધ નિયંત્રણ અને માનસિક શાંતિ",
      "કર્મ અને ફરજ અંગે ચોક્કસ સ્પષ્ટતા",
      "સંબંધો અને આંતરિક સ્થિરતા",
    ],
    highlightsHi: [
      "चिंता, अवसाद और तनाव निवारण",
      "क्रोध नियंत्रण और मानसिक शांति",
      "कर्म और कर्तव्य संबंधी स्पष्टता",
      "संबंध और आंतरिक स्थिरता",
    ],
    highlightsEn: [
      "Relief from anxiety, depression and stress",
      "Anger control and mental peace",
      "Clarity on duty, action and Karma Yoga",
      "Harmonious relationships and inner balance",
    ],
    link: "/guidance",
    linkText: "માર્ગદર્શન મેળવો",
    linkTextHi: "मार्गदर्शन प्राप्त करें",
    linkTextEn: "Get Guidance",
  },
  {
    id: "quiz",
    num: "04",
    category: "જ્ઞાન કસોટી",
    categoryHi: "ज्ञान परीक्षा",
    categoryEn: "Knowledge Test",
    icon: HelpCircle,
    iconColor: "#1a73e8",
    bgGlow: "rgba(26, 115, 232, 0.12)",
    badge: "MCQ કસોટી",
    badgeHi: "MCQ परीक्षा",
    badgeEn: "MCQ Test",
    title: "ઇન્ટરેક્ટિવ ગીતા ક્વિઝ",
    titleHi: "इंटरैक्टिव गीता क्विज़",
    titleEn: "Interactive Gita Quiz",
    description:
      "અધ્યાય વાઇઝ અને વિવિધ વિષયો પર રસપ્રદ બહુવિકલ્પી (MCQ) પ્રશ્નોત્તરી. રમતા રમતા ગીતાજીના ગહન સિદ્ધાંતો શીખો અને તમારો સ્કોર તપાસો.",
    descriptionHi:
      "अध्यायवार और विविध विषयों पर रोचक बहुविकल्पीय (MCQ) प्रश्नोत्तरी। खेलते-खेलते गीता जी के गहन सिद्धांतों को सीखें और अपना स्कोर जांचें।",
    descriptionEn:
      "Chapter-wise and thematic multiple-choice questions. Learn the profound principles of the Gita while having fun and testing your knowledge.",
    highlights: [
      "અધ્યાયવાર રસપ્રદ અને જ્ઞાનવર્ધક પ્રશ્નો",
      "લાઈવ ટાઈમર અને તાત્કાલિક સ્કોરિંગ",
      "સાચા ઉત્તરો સાથે વિગતવાર સમજૂતી",
      "તમામ જૂની ક્વિઝની હિસ્ટ્રી ટ્રેકિંગ",
    ],
    highlightsHi: [
      "अध्यायवार रोचक और ज्ञानवर्धक प्रश्न",
      "लाइव टाइमर और त्वरित स्कोरिंग",
      "सही उत्तरों सहित विस्तृत व्याख्या",
      "सभी पुरानी क्विज़ की हिस्ट्री ट्रैकिंग",
    ],
    highlightsEn: [
      "Engaging and educational chapter-wise questions",
      "Live timer with instant scoring",
      "Detailed explanations with correct answers",
      "Complete history tracking of past quizzes",
    ],
    link: "/quiz-category",
    linkText: "ક્વિઝ રમો",
    linkTextHi: "क्विज़ खेलें",
    linkTextEn: "Play Quiz",
  },
  {
    id: "achievements",
    num: "05",
    category: "સિદ્ધિઓ",
    categoryHi: "उपलब्धियां",
    categoryEn: "Achievements",
    icon: Award,
    iconColor: "#1a73e8",
    bgGlow: "rgba(26, 115, 232, 0.12)",
    badge: "ડિજિટલ બેજીસ",
    badgeHi: "डिजिटल बैज",
    badgeEn: "Digital Badges",
    title: "ક્વિઝ અચીવમેન્ટ્સ અને બેજીસ",
    titleHi: "क्विज़ उपलब्धियां और बैज",
    titleEn: "Quiz Achievements & Badges",
    description:
      "જેમ જેમ તમે ક્વિઝ રમતા જશો અને શ્લોકો શીખતા જશો, તેમ તેમ તમને વિશેષ ડિજિટલ આધ્યાત્મિક સિદ્ધિ બેજીસ અને ટ્રોફીઝ પ્રાપ્ત થશે.",
    descriptionHi:
      "जैसे-जैसे आप क्विज़ खेलते जाएंगे और श्लोक सीखते जाएंगे, वैसे-वैसे आपको विशेष डिजिटल आध्यात्मिक उपलब्धि बैज और ट्रॉफियां प्राप्त होंगी।",
    descriptionEn:
      "As you complete quizzes and master shlokas, earn unique spiritual achievement badges and trophies.",
    highlights: [
      "જિજ્ઞાસુ, સાધક, જ્ઞાનરત્ન જેવા વિશિષ્ટ બેજીસ",
      "સ્કોર મલ્ટિપ્લાયર્સ અને માઇલસ્ટોન્સ",
      "અનલૉક કરેલ બેજીસનું સુંદર ડિસ્પ્લે",
      "સતત પ્રગતિ માટે પ્રેરક પ્રોગ્રેસ બાર",
    ],
    highlightsHi: [
      "जिज्ञासु, साधक, ज्ञानरत्न जैसे विशिष्ट बैज",
      "स्कोर मल्टीप्लायर्स और माइलस्टोन्स",
      "अनलॉक किए गए बैज का सुंदर डिस्प्ले",
      "निरंतर प्रगति हेतु प्रेरक प्रोग्रेस बार",
    ],
    highlightsEn: [
      "Distinctive badges: Seeker, Practitioner, Master",
      "Score multipliers and milestones",
      "Visual showcase of unlocked badges",
      "Motivational progress tracking",
    ],
    link: "/quiz-achievements",
    linkText: "સિદ્ધિઓ જુઓ",
    linkTextHi: "उपलब्धियां देखें",
    linkTextEn: "View Achievements",
  },
  {
    id: "tracker",
    num: "06",
    category: "દૈનિક સ્વાધ્યાય",
    categoryHi: "दैनिक स्वाध्याय",
    categoryEn: "Daily Practice",
    icon: Flame,
    iconColor: "#1a73e8",
    bgGlow: "rgba(26, 115, 232, 0.12)",
    badge: "Daily Streak",
    badgeHi: "Daily Streak",
    badgeEn: "Daily Streak",
    title: "વાંચન પ્રગતિ ટ્રેકર અને સ્ટ્રીક્સ",
    titleHi: "पठन प्रगति ट्रैकर और स्ट्रीक्स",
    titleEn: "Reading Tracker & Streaks",
    description:
      "રોજિંદા ગીતા વાચનની ટેવ કેળવો. તમારી દૈનિક Streak (સતત કેટલા દિવસ વાંચ્યું), કેટલા શ્લોકો પૂર્ણ કર્યા અને કેટલા અધ્યાય બાકી છે તેનો લાઈવ આલેખ.",
    descriptionHi:
      "प्रतिदिन गीता पठन की आदत डालें। अपनी दैनिक Streak (लगातार कितने दिन पढ़ा), कितने श्लोक पूर्ण किए और कितने अध्याय शेष हैं इसका सजीव विवरण।",
    descriptionEn:
      "Build a consistent daily reading habit. Track your streak, shlokas completed, and chapters finished with live analytics.",
    highlights: [
      "દૈનિક સ્ટ્રીક કાઉન્ટર (Reading Streak)",
      "કુલ વાંચેલા શ્લોકો અને અધ્યાયની ટકાવારી",
      "દૈનિક વાચન ટાર્ગેટ અને પૂર્ણતા પ્રગતિ",
      "આધ્યાત્મિક શિસ્ત જાળવવામાં મદદરૂપ",
    ],
    highlightsHi: [
      "दैनिक स्ट्रीक काउंटर (Reading Streak)",
      "कुल पढ़े गए श्लोक और अध्याय का प्रतिशत",
      "दैनिक पठन लक्ष्य और पूर्णता प्रगति",
      "आध्यात्मिक अनुशासन बनाए रखने में सहायक",
    ],
    highlightsEn: [
      "Daily reading streak counter",
      "Total shlokas read and percentage completed",
      "Daily reading targets and milestones",
      "Encourages spiritual discipline and consistency",
    ],
    link: "/reading-tracker",
    linkText: "પ્રગતિ તપાસો",
    linkTextHi: "प्रगति जांचें",
    linkTextEn: "Check Progress",
  },
  {
    id: "daily-shlok",
    num: "07",
    category: "દૈનિક પ્રેરણા",
    categoryHi: "दैनिक प्रेरणा",
    categoryEn: "Daily Wisdom",
    icon: Sparkles,
    iconColor: "#1a73e8",
    bgGlow: "rgba(26, 115, 232, 0.12)",
    badge: "આજનો શ્લોક",
    badgeHi: "आज का श्लोक",
    badgeEn: "Today's Shloka",
    title: "આજનો શ્લોક & સોશિયલ કાર્ડ શેરિંગ",
    titleHi: "आज का श्लोक एवं सोशल कार्ड शेयरिंग",
    titleEn: "Today's Shloka & Card Sharing",
    description:
      "રોજ સવારે એક નવો પ્રેરણાદાયક શ્લોક, ગુજરાતી અર્થ અને આજના દિવસ માટેનો સંદેશ. વ્હોટ્સએપ કે સોશિયલ મીડિયા પર શેર કરવા માટે સુંદર HD કાર્ડ બનાવો.",
    descriptionHi:
      "प्रतिदिन प्रातः एक नया प्रेरणादायक श्लोक, हिंदी अर्थ और आज के दिन के लिए संदेश। व्हाट्सएप या सोशल मीडिया पर साझा करने के लिए सुंदर HD कार्ड बनाएं।",
    descriptionEn:
      "A fresh inspiring shloka every morning with translation and daily life message. Generate and download beautiful HD cards to share.",
    highlights: [
      "દરરોજ નવો પ્રેરણાદાયક દૈનિક શ્લોક",
      "આજના દિવસ માટે વ્યવહારિક જીવન સંદેશ",
      "સુંદર શ્લોક કાર્ડ ઇમેજ ડાઉનલોડ & શેર",
      "WhatsApp / Social Media એક ક્લિકમાં શેર",
    ],
    highlightsHi: [
      "प्रतिदिन नया प्रेरणादायक दैनिक श्लोक",
      "आज के दिन के लिए व्यावहारिक जीवन संदेश",
      "सुंदर श्लोक कार्ड इमेज डाउनलोड एवं शेयर",
      "WhatsApp / सोशल मीडिया एक क्लिक में शेयर",
    ],
    highlightsEn: [
      "Fresh inspirational shloka every morning",
      "Practical daily life message for the day",
      "Download and share HD shloka image cards",
      "One-click sharing on WhatsApp and social media",
    ],
    link: "/",
    linkText: "આજનો શ્લોક જુઓ",
    linkTextHi: "आज का श्लोक देखें",
    linkTextEn: "View Today's Shloka",
  },
  {
    id: "favorites",
    num: "08",
    category: "અંગત સંગ્રહ",
    categoryHi: "व्यक्तिगत संग्रह",
    categoryEn: "Personal Collection",
    icon: Heart,
    iconColor: "#1a73e8",
    bgGlow: "rgba(26, 115, 232, 0.12)",
    badge: "Bookmarks",
    badgeHi: "Bookmarks",
    badgeEn: "Bookmarks",
    title: "મનપસંદ શ્લોક (Bookmarks)",
    titleHi: "पसंदीदा श्लोक (Bookmarks)",
    titleEn: "Favorite Shlokas (Bookmarks)",
    description:
      "જે શ્લોક તમને ખાસ ગમી જાય કે જીવનમાં માર્ગદર્શક લાગે તેને એક જ ક્લિકમાં બુકમાર્ક કરીને તમારા પર્સનલ કલેક્શનમાં સાચવો.",
    descriptionHi:
      "जो श्लोक आपको विशेष रूप से पसंद आए या जीवन में मार्गदर्शक लगे, उसे एक ही क्लिक में बुकमार्क करके अपने व्यक्तिगत संग्रह में सहेजें।",
    descriptionEn:
      "Save beloved shlokas that inspire you with one tap into your personal bookmarked collection.",
    highlights: [
      "એક જ ક્લિકમાં શ્લોક બુકમાર્ક કરવાની સુવિધા",
      "ગમે ત્યારે સરળતાથી રિવિઝન કરો",
      "તમારા એકાઉન્ટ સાથે સુરક્ષિત સેવ રહે છે",
      "ઝડપી એક્સેસ માટે પર્સનલ લિસ્ટ",
    ],
    highlightsHi: [
      "एक ही क्लिक में श्लोक बुकमार्क करने की सुविधा",
      "कभी भी सरलता से पुनरावृत्ति करें",
      "आपके खाते में सुरक्षित सहेजा रहता है",
      "त्वरित पहुंच के लिए व्यक्तिगत सूची",
    ],
    highlightsEn: [
      "One-click bookmarking of favorite verses",
      "Quick revision anytime, anywhere",
      "Securely saved to your user profile",
      "Custom list for quick spiritual access",
    ],
    link: "/favorites",
    linkText: "મનપસંદ શ્લોક",
    linkTextHi: "पसंदीदा श्लोक देखें",
    linkTextEn: "View Favorites",
  },
  {
    id: "history",
    num: "09",
    category: "ઇતિહાસ",
    categoryHi: "इतिहास",
    categoryEn: "History",
    icon: Clock,
    iconColor: "#1a73e8",
    bgGlow: "rgba(26, 115, 232, 0.12)",
    badge: "Cloud Sync",
    badgeHi: "Cloud Sync",
    badgeEn: "Cloud Sync",
    title: "વાંચન અને ક્વિઝ ઇતિહાસ",
    titleHi: "पठन और क्विज़ इतिहास",
    titleEn: "Reading & Quiz History",
    description:
      "તમે ક્યારે કયો શ્લોક વાંચ્યો અને ભૂતકાળમાં કઈ ક્વિઝ આપી હતી તેનો સંપૂર્ણ કાલક્રમિક ઇતિહાસ. કોઈપણ શ્લોક કે રિઝલ્ટ પર ફરી જવા માટે સીધો શોર્ટકટ.",
    descriptionHi:
      "आपने कब कौन सा श्लोक पढ़ा और अतीत में कौन सी क्विज़ दी थी उसका सम्पूर्ण कालक्रमिक इतिहास। किसी भी श्लोक या परिणाम पर पुनः जाने का सीधा शॉर्टकट।",
    descriptionEn:
      "Complete chronological history of shlokas you've read and quizzes you've taken with quick jump links.",
    highlights: [
      "વાંચેલા શ્લોકોની તારીખવાર નોંધ",
      "ક્વિઝ આપેલા સ્કોર્સ અને તારીખો",
      "એક ક્લિકમાં તે શ્લોક પર પાછા જવાની સુવિધા",
      "સંપૂર્ણ ક્લાઉડ સિંક્રનાઇઝેશન",
    ],
    highlightsHi: [
      "पढ़े गए श्लोकों का तिथिवार विवरण",
      "क्विज़ दिए गए स्कोर और तिथियां",
      "एक क्लिक में उस श्लोक पर वापस जाने की सुविधा",
      "सम्पूर्ण क्लाउड सिंक्रोनाइज़ेशन",
    ],
    highlightsEn: [
      "Dated history of all verses read",
      "Past quiz scores and dates",
      "One-click jump back to any shloka or result",
      "Seamless multi-device cloud synchronization",
    ],
    link: "/history",
    linkText: "ઇતિહાસ જુઓ",
    linkTextHi: "इतिहास देखें",
    linkTextEn: "View History",
  },
  {
    id: "theme",
    num: "10",
    category: "સુગમ વાચન",
    categoryHi: "सुगम पठन",
    categoryEn: "Easy Reading",
    icon: Sun,
    iconColor: "#1a73e8",
    bgGlow: "rgba(26, 115, 232, 0.12)",
    badge: "થીમ્સ & ફૉન્ટ",
    badgeHi: "थीम एवं फॉन्ट",
    badgeEn: "Themes & Fonts",
    title: "ડાર્ક & લાઇટ મોડ અને ફૉન્ટ કંટ્રોલ",
    titleHi: "डार्क एवं लाइट मोड और फॉन्ट नियंत्रण",
    titleEn: "Dark & Light Modes & Font Control",
    description:
      "રાત્રિના સમયે આંખો પર તાણ ન પડે તે માટે રૉયલ ડાર્ક થીમ અને દિવસ માટે ક્લીન લાઇટ થીમ. સાથે ફૉન્ટ સાઈઝ નાના-મોટા કરવાની અનુકૂળતા.",
    descriptionHi:
      "रात्रि के समय आंखों पर तनाव न पड़े इसके लिए रॉयल डार्क थीम और दिन के लिए स्वच्छ लाइट थीम। साथ ही फॉन्ट आकार छोटा-बड़ा करने की सुविधा।",
    descriptionEn:
      "Royal dark mode for night-time comfort and clean light mode for daytime reading, along with customizable font sizing.",
    highlights: [
      "આંખોને અનુકૂળ ડાર્ક અને લાઇટ થીમ",
      "વાંચન માટે એડજસ્ટેબલ ફૉન્ટ સાઇઝ",
      "મોબાઇલ, ટેબ્લેટ અને ડેસ્કટોપ પર ફુલ રિસ્પોન્સિવ",
      "ઝીરો ડિસ્ટ્રેક્શન વાચન અનુભવ",
    ],
    highlightsHi: [
      "आंखों के अनुकूल डार्क और लाइट थीम",
      "पठन हेतु समायोज्य फॉन्ट आकार",
      "मोबाइल, टैबलेट और डेस्कटॉप पर पूर्णतः रिस्पॉन्सिव",
      "शून्य विचलन पठन अनुभव",
    ],
    highlightsEn: [
      "Eye-comfort Dark and Light themes",
      "Adjustable font sizes for effortless reading",
      "Fully responsive on mobile, tablet, and desktop",
      "Distraction-free spiritual immersion",
    ],
    link: "/chapters",
    linkText: "વાંચન શરૂ કરો",
    linkTextHi: "पठन शुरू करें",
    linkTextEn: "Start Reading",
  },
  {
    id: "feedback",
    num: "11",
    category: "યુઝર સંવાદ",
    categoryHi: "उपयोगकर्ता संवाद",
    categoryEn: "User Feedback",
    icon: Star,
    iconColor: "#1a73e8",
    bgGlow: "rgba(26, 115, 232, 0.12)",
    badge: "૫-સ્ટાર રેટિંગ",
    badgeHi: "5-स्टार रेटिंग",
    badgeEn: "5-Star Rating",
    title: "પ્રતિસાદ & 5-સ્ટાર રેટિંગ સિસ્ટમ",
    titleHi: "प्रतिक्रिया एवं 5-स्टार रेटिंग प्रणाली",
    titleEn: "Feedback & 5-Star Ratings",
    description:
      "આ પ્લેટફોર્મ તમને કેવું લાગ્યું તે અંગે તમારો કિંમતી અભિપ્રાય આપો. વપરાશકર્તાઓના ફીડબેકના આધારે અમે સતત નવી સુવિધાઓ ઉમેરીએ છીએ.",
    descriptionHi:
      "यह प्लेटफॉर्म आपको कैसा लगा इस बारे में अपनी बहुमूल्य राय दें। उपयोगकर्ताओं के फीडबैक के आधार पर हम निरंतर नई सुविधाएं जोड़ते हैं।",
    descriptionEn:
      "Share your valuable feedback and rating. We continuously enhance features based on your suggestions.",
    highlights: [
      "સરળ 5-સ્ટાર રેટિંગ આપવાની સુવિધા",
      "સૂચનો અને મંતવ્યો સીધા શેર કરો",
      "નિરંતર સુધારા માટે સીધો સંવાદ",
      "તમારા દરેક સૂચનને સન્માન",
    ],
    highlightsHi: [
      "सरल 5-स्टार रेटिंग देने की सुविधा",
      "सुझाव और विचार सीधे साझा करें",
      "निरंतर सुधार हेतु सीधा संवाद",
      "आपके प्रत्येक सुझाव का सम्मान",
    ],
    highlightsEn: [
      "Simple 5-star rating system",
      "Direct feedback and feature suggestion submission",
      "Continuous updates driven by community feedback",
      "Every user suggestion is valued and heard",
    ],
    actionType: "feedback",
    linkText: "પ્રતિસાદ આપો",
    linkTextHi: "प्रतिक्रिया दें",
    linkTextEn: "Give Feedback",
  },
];

function About() {
  const { isHindi, isEnglish, txt } = useLanguage();
  const [selectedFeature, setSelectedFeature] = useState(null);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedFeature(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Lock body and html scroll only when modal is open so background doesn't scroll
  useEffect(() => {
    if (selectedFeature) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [selectedFeature]);

  const openAiAssistant = () => {
    setSelectedFeature(null);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("open-gita-ai-assistant"));
    }, 50);
  };

  const openFeedback = () => {
    setSelectedFeature(null);
    window.dispatchEvent(new CustomEvent("open-feedback-modal"));
  };

  const getItemCategory = (item) => isEnglish ? item.categoryEn : (isHindi ? item.categoryHi : item.category);
  const getItemTitle = (item) => isEnglish ? item.titleEn : (isHindi ? item.titleHi : item.title);
  const getItemBadge = (item) => isEnglish ? item.badgeEn : (isHindi ? item.badgeHi : item.badge);
  const getItemDesc = (item) => isEnglish ? item.descriptionEn : (isHindi ? item.descriptionHi : item.description);
  const getItemHighlights = (item) => isEnglish ? item.highlightsEn : (isHindi ? item.highlightsHi : item.highlights);
  const getItemLinkText = (item) => isEnglish ? item.linkTextEn : (isHindi ? item.linkTextHi : item.linkText);

  return (
    <main className="about-compact-page">
      {/* =====================================================
          BACKGROUND AMBIENT RAYS & CHAKRA (CONTAINED)
      ===================================================== */}
      <div className="about-compact-bg" aria-hidden="true">
        <div className="bg-glow-orb orb-1" />
        <div className="bg-glow-orb orb-2" />
        <div className="bg-chakra spin-slow" />
      </div>

      <div className="about-compact-container">
        {/* =====================================================
            CENTERED TOP BAR: TITLE (CLEAN & COMPACT)
        ===================================================== */}
        <header className="compact-header-centered">
          <div className="compact-title-wrap">
            <Flower2 size={24} className="compact-logo-flower" />
            <h1>
              {txt("શ્રીમદ્ ભગવદ્ ગીતા", "श्रीमद्भगवद्गीता", "Shrimad Bhagavad Gita")}{" "}
              <span className="title-sep">•</span>{" "}
              <span className="blue-title-text">{txt("તમામ વિશેષતાઓ", "सभी विशेषताएं", "All Features")}</span>
            </h1>
          </div>
        </header>

        {/* =====================================================
            CENTERED GRID: 11 COMPACT FEATURE BUTTONS
        ===================================================== */}
        <section className="compact-grid-wrapper">
          <div className="features-centered-grid">
            {FEATURES_DATA.map((item) => {
              const ItemIcon = item.icon;
              const itemCategory = getItemCategory(item);
              const itemTitle = getItemTitle(item);

              return (
                <button
                  key={item.id}
                  type="button"
                  className="feature-btn-card"
                  onClick={() => setSelectedFeature(item)}
                >
                  <div className="card-top-row">
                    <div className="card-top-left">
                      <span className="card-num-pill">{item.num}</span>
                      <span className="card-category-tag">{itemCategory}</span>
                    </div>
                    <span className="card-hover-hint">
                      <span>{txt("વિગતવાર", "विस्तार से", "Details")}</span>
                      <ChevronRight size={13} />
                    </span>
                  </div>

                  <div className="card-main-content">
                    <div className="card-icon-box">
                      <ItemIcon size={18} />
                    </div>

                    <div className="card-text-col">
                      <h3 className="card-title">{itemTitle}</h3>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* =====================================================
            ABOUT FOOTER: SPIRITUAL MISSION & LEGAL DISCLAIMER
        ===================================================== */}
        <footer className="about-compact-footer">
          <div className="about-disclaimer-card">
            <div className="about-disclaimer-header">
              <div className="about-disclaimer-icon-badge">
                <ShieldCheck size={22} color="#059669" />
              </div>
              <div>
                <h3 className="about-disclaimer-title">
                  {txt(
                    "આધ્યાત્મિક ઉદ્દેશ્ય અને કાનૂની અસ્વીકરણ (Legal Disclaimer)",
                    "आध्यात्मिक उद्देश्य एवं कानूनी अस्वीकरण (Legal Disclaimer)",
                    "Spiritual Mission & Legal Disclaimer"
                  )}
                </h3>
                <span className="about-disclaimer-badge">
                  {txt("બિન-વ્યાવસાયિક જ્ઞાન સેવા", "गैर-व्यावसायिक ज्ञान सेवा", "Non-Commercial Service")}
                </span>
              </div>
            </div>

            <p className="about-disclaimer-text">
              {txt(
                "શ્રીમદ્ ભગવદ્ ગીતા એ સર્વ માનવજાતના આધ્યાત્મિક કલ્યાણ માટેનો સનાતન ધર્મગ્રંથ છે, જે સાર્વજનિક સંપત્તિ (Public Domain) છે. આ પ્લેટફોર્મ સંપૂર્ણપણે બિન-વ્યાવસાયિક (Non-Commercial), શૈક્ષણિક અને નિઃશુલ્ક જ્ઞાન સેવાના પવિત્ર ઉદ્દેશ્યથી બનાવવામાં આવ્યું છે. અહીં પ્રસ્તુત સંસ્કૃત શ્લોકો, સરળ ભાવાર્થ, શબ્દાર્થ, જીવન સંદેશ અને AI ઑડિયો વાચકોને ગીતાજીના દિવ્ય જ્ઞાન સાથે સરળતાથી જોડવા માટે છે. કોઈપણ સામગ્રીનો ઉપયોગ વ્યાવસાયિક વેચાણ કે નફા માટે કરવામાં આવતો નથી (The Indian Copyright Act, 1957 - Section 52 Fair Dealing).",
                "श्रीमद्भगवद्गीता समस्त मानव कल्याण और आध्यात्मिक उत्थान के लिए सनातन धर्मग्रंथ है, जो सार्वजनिक संपत्ति (Public Domain) है। यह मंच पूर्णतः गैर-व्यावसायिक (Non-Commercial), शैक्षिक और निःशुल्क ज्ञान सेवा के पवित्र उद्देश्य से निर्मित है। यहाँ प्रस्तुत संस्कृत श्लोक, सरल भावार्थ, शब्दार्थ, जीवन संदेश और AI ऑडियो पाठकों को प्रभु श्रीकृष्ण के दिव्य उपदेशों से जोड़ने के लिए हैं। किसी भी सामग्री का उपयोग व्यावसायिक लाभ हेतु नहीं किया जाता है।",
                "The Shrimad Bhagavad Gita is an ancient sacred scripture belonging to the Public Domain for the spiritual upliftment of humanity. This platform is non-commercial, free, and educational in nature (Fair Dealing under Section 52 of the Indian Copyright Act, 1957). All Sanskrit verses, word meanings, translations, life guidance, and AI audio are provided solely for devotional and educational purposes without any commercial intent."
              )}
            </p>

            <div className="about-disclaimer-pills">
              <span className="about-pill-item">
                <CheckCircle2 size={14} color="#10b981" />
                <span>{txt("100% સાર્વજનિક ધર્મગ્રંથ (Public Domain)", "100% सार्वजनिक धर्मग्रंथ (Public Domain)", "100% Public Domain Text")}</span>
              </span>
              <span className="about-pill-item">
                <CheckCircle2 size={14} color="#10b981" />
                <span>{txt("નિઃશુલ્ક આધ્યાત્મિક સેવા", "निःशुल्क आध्यात्मिक सेवा", "Free Spiritual Service")}</span>
              </span>
              <span className="about-pill-item">
                <CheckCircle2 size={14} color="#10b981" />
                <span>{txt("Fair Dealing Protection (Sec 52)", "Fair Dealing Protection (Sec 52)", "Fair Dealing Protection (Sec 52)")}</span>
              </span>
            </div>

            <div className="about-footer-bottom-row">
              <p>
                © {new Date().getFullYear()} {txt("શ્રીમદ્ ભગવદ્ ગીતા | સર્વ ભક્તોના કલ્યાણ માટે સમર્પિત", "श्रीमद्भगवद्गीता | सर्व भक्तों के कल्याण हेतु समर्पित", "Shrimad Bhagavad Gita | Dedicated to the welfare of all")}
              </p>
              <span className="about-mantra-tag">
                ॐ નમો ભગવતે વાસુદેવાય
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* =====================================================
          CENTERED MODAL POPUP FOR FEATURE DETAILS (PORTAL TO SCREEN CENTER)
      ===================================================== */}
      {selectedFeature && typeof document !== "undefined" && createPortal(
        <div
          className="about-modal-backdrop"
          onClick={() => setSelectedFeature(null)}
        >
          <div
            className="about-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-header-left">
                <span className="modal-category-badge">
                  {getItemCategory(selectedFeature)}
                </span>
                <span className="modal-num-badge">
                  {selectedFeature.num} / 11 • {getItemBadge(selectedFeature)}
                </span>
              </div>

              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedFeature(null)}
                aria-label={txt("બંધ કરો", "बंद करें", "Close")}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Hero Row */}
            <div className="modal-hero-row">
              <div className="modal-icon-box">
                <selectedFeature.icon size={30} />
              </div>

              <div className="modal-hero-text">
                <h2>{getItemTitle(selectedFeature)}</h2>
                <p>{getItemDesc(selectedFeature)}</p>
              </div>
            </div>

            {/* Modal Highlights 2x2 Grid */}
            <div className="modal-highlights-grid">
              {getItemHighlights(selectedFeature).map((hl, hlIdx) => (
                <div key={hlIdx} className="modal-hl-item">
                  <CheckCircle2
                    size={16}
                    className="modal-hl-check"
                  />
                  <span>{hl}</span>
                </div>
              ))}
            </div>

            {/* Modal Footer Action */}
            <div className="modal-footer">
              <button
                type="button"
                className="modal-secondary-btn"
                onClick={() => setSelectedFeature(null)}
              >
                {txt("બંધ કરો", "बंद करें", "Close")}
              </button>

              {selectedFeature.link ? (
                <Link
                  to={selectedFeature.link}
                  className="modal-primary-btn"
                  onClick={() => setSelectedFeature(null)}
                >
                  <span>{getItemLinkText(selectedFeature)}</span>
                  <ArrowRight size={16} />
                </Link>
              ) : selectedFeature.actionType === "ai" ? (
                <button
                  type="button"
                  onClick={openAiAssistant}
                  className="modal-primary-btn"
                >
                  <Brain size={16} />
                  <span>{getItemLinkText(selectedFeature)}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openFeedback}
                  className="modal-primary-btn"
                >
                  <Star size={16} />
                  <span>{getItemLinkText(selectedFeature)}</span>
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}

export default About;
