import type { Lang } from "./strings";

/** icon: a BadgeIcon key used as the chapter mark */
export type Chapter = { icon: string; eyebrow: string; title: string; body: string };
export type LandingText = { kicker: string; tag: string; scroll: string; chapters: Chapter[]; stats: [string, string][]; enter: string; guide: string };

const en: LandingText = {
  kicker: "Night-sky mission planner",
  tag: "Read the sky. Plan the night.",
  scroll: "Scroll",
  chapters: [
    { icon: "yu", eyebrow: "The problem", title: "The sky is open. Most nights, we miss it.",
      body: "Clouds, haze, city glow and bad timing waste our nights out. And when we finally take a photo, AI \"enhancers\" quietly paint in stars that were never there." },
    { icon: "rei", eyebrow: "Sky Finder · where and when", title: "Find the clearest sky near you.",
      body: "Celestra finds viewpoints, peaks and observatories around you and scores every hour from dusk to dawn. Cloud, haze, darkness, wind, the Moon and rain become one Sky Quality Score, with its best two-hour window." },
    { icon: "jin", eyebrow: "Sky Calendar · what's up there", title: "Know what you can actually see.",
      body: "One lunar calendar for Moon phases, meteor showers, eclipses, planets, Space Station passes and rocket launches, each checked against your own horizon, with reminders." },
    { icon: "makoto", eyebrow: "Image Lab · proof, not pixels", title: "Clean images. Verified true.",
      body: "It removes noise, repairs sensor defects, marks every star, galaxy and nebula, and writes a report on your shot. Then the Integrity Check proves nothing was invented, lost, moved or dimmed." },
    { icon: "meiyo", eyebrow: "Mission Log · your journey", title: "Go out. Look up. Level up.",
      body: "Log what you see and earn Mission Points when the sky confirms it. Built on free, open science data, in English, हिन्दी and ਪੰਜਾਬੀ." },
  ],
  stats: [["4", "tools in one place"], ["3", "languages"], ["0", "invented stars"]],
  enter: "Launch Mission Control",
  guide: "Read the guide",
};

const hi: LandingText = {
  kicker: "रात्रि-आकाश मिशन योजक",
  tag: "आकाश को पढ़ें। रात की योजना बनाएँ।",
  scroll: "स्क्रॉल करें",
  chapters: [
    { icon: "yu", eyebrow: "समस्या", title: "आकाश खुला है। पर ज़्यादातर रातें हम चूक जाते हैं।",
      body: "बादल, धुंध, शहर की रोशनी और गलत समय हमारी रातें बर्बाद करते हैं। और जब आख़िरकार फ़ोटो लेते हैं, तो AI \"एन्हांसर\" चुपचाप ऐसे तारे जोड़ देते हैं जो थे ही नहीं।" },
    { icon: "rei", eyebrow: "स्काई फ़ाइंडर · कहाँ और कब", title: "अपने पास सबसे साफ़ आकाश खोजें।",
      body: "सेलेस्ट्रा आपके आसपास के दृश्य स्थल, चोटियाँ और वेधशालाएँ खोजता है और शाम से सुबह तक हर घंटे का स्कोर देता है। बादल, धुंध, अँधेरा, हवा, चंद्रमा और बारिश, एक आकाश गुणवत्ता स्कोर में, सबसे अच्छे दो घंटों के साथ।" },
    { icon: "jin", eyebrow: "आकाश कैलेंडर · ऊपर क्या है", title: "जानें आप सच में क्या देख सकते हैं।",
      body: "चंद्र कलाएँ, उल्का वर्षा, ग्रहण, ग्रह, अंतरिक्ष स्टेशन और रॉकेट लॉन्च, एक चंद्र कैलेंडर में, हर एक आपके अपने क्षितिज से जाँचा हुआ, अनुस्मारक के साथ।" },
    { icon: "makoto", eyebrow: "इमेज लैब · पिक्सेल नहीं, प्रमाण", title: "साफ़ तस्वीरें। सत्यापित सच।",
      body: "यह शोर हटाता है, सेंसर दोष ठीक करता है, हर तारा, आकाशगंगा और नीहारिका चिह्नित करता है और आपके शॉट पर रिपोर्ट लिखता है। फिर अखंडता जाँच साबित करती है कि कुछ भी जोड़ा, खोया, खिसका या फीका नहीं हुआ।" },
    { icon: "meiyo", eyebrow: "मिशन लॉग · आपकी यात्रा", title: "बाहर निकलें। ऊपर देखें। आगे बढ़ें।",
      body: "जो देखा उसे दर्ज करें और आकाश पुष्टि करे तो मिशन अंक पाएँ। मुफ़्त, खुले विज्ञान आँकड़ों पर बना, English, हिन्दी और ਪੰਜਾਬੀ में।" },
  ],
  stats: [["4", "उपकरण एक जगह"], ["3", "भाषाएँ"], ["0", "नकली तारे"]],
  enter: "मिशन कंट्रोल शुरू करें",
  guide: "गाइड पढ़ें",
};

const pa: LandingText = {
  kicker: "ਰਾਤ-ਅਸਮਾਨ ਮਿਸ਼ਨ ਯੋਜਕ",
  tag: "ਅਸਮਾਨ ਨੂੰ ਪੜ੍ਹੋ। ਰਾਤ ਦੀ ਯੋਜਨਾ ਬਣਾਓ।",
  scroll: "ਸਕ੍ਰੋਲ ਕਰੋ",
  chapters: [
    { icon: "yu", eyebrow: "ਸਮੱਸਿਆ", title: "ਅਸਮਾਨ ਖੁੱਲ੍ਹਾ ਹੈ। ਪਰ ਬਹੁਤੀਆਂ ਰਾਤਾਂ ਅਸੀਂ ਖੁੰਝ ਜਾਂਦੇ ਹਾਂ।",
      body: "ਬੱਦਲ, ਧੁੰਦ, ਸ਼ਹਿਰ ਦੀ ਰੌਸ਼ਨੀ ਅਤੇ ਗ਼ਲਤ ਸਮਾਂ ਸਾਡੀਆਂ ਰਾਤਾਂ ਬਰਬਾਦ ਕਰਦੇ ਹਨ। ਅਤੇ ਜਦੋਂ ਆਖ਼ਰਕਾਰ ਫ਼ੋਟੋ ਲੈਂਦੇ ਹਾਂ, ਤਾਂ AI \"ਐਨਹਾਂਸਰ\" ਚੁੱਪਚਾਪ ਅਜਿਹੇ ਤਾਰੇ ਜੋੜ ਦਿੰਦੇ ਹਨ ਜੋ ਕਦੇ ਸਨ ਹੀ ਨਹੀਂ।" },
    { icon: "rei", eyebrow: "ਸਕਾਈ ਫ਼ਾਈਂਡਰ · ਕਿੱਥੇ ਅਤੇ ਕਦੋਂ", title: "ਆਪਣੇ ਨੇੜੇ ਸਭ ਤੋਂ ਸਾਫ਼ ਅਸਮਾਨ ਲੱਭੋ।",
      body: "ਸੈਲੇਸਟ੍ਰਾ ਤੁਹਾਡੇ ਆਲੇ-ਦੁਆਲੇ ਨਜ਼ਾਰਾ ਥਾਵਾਂ, ਚੋਟੀਆਂ ਅਤੇ ਵੇਧਸ਼ਾਲਾਵਾਂ ਲੱਭਦਾ ਹੈ ਅਤੇ ਸ਼ਾਮ ਤੋਂ ਸਵੇਰ ਤੱਕ ਹਰ ਘੰਟੇ ਦਾ ਸਕੋਰ ਦਿੰਦਾ ਹੈ। ਬੱਦਲ, ਧੁੰਦ, ਹਨੇਰਾ, ਹਵਾ, ਚੰਨ ਅਤੇ ਮੀਂਹ, ਇੱਕ ਅਸਮਾਨ ਗੁਣਵੱਤਾ ਸਕੋਰ ਵਿੱਚ, ਸਭ ਤੋਂ ਵਧੀਆ ਦੋ ਘੰਟਿਆਂ ਨਾਲ।" },
    { icon: "jin", eyebrow: "ਅਸਮਾਨੀ ਕੈਲੰਡਰ · ਉੱਪਰ ਕੀ ਹੈ", title: "ਜਾਣੋ ਤੁਸੀਂ ਸੱਚਮੁੱਚ ਕੀ ਵੇਖ ਸਕਦੇ ਹੋ।",
      body: "ਚੰਦਰ ਕਲਾਵਾਂ, ਉਲਕਾ ਵਰਖਾ, ਗ੍ਰਹਿਣ, ਗ੍ਰਹਿ, ਪੁਲਾੜ ਸਟੇਸ਼ਨ ਅਤੇ ਰਾਕੇਟ ਲਾਂਚ, ਇੱਕ ਚੰਦਰ ਕੈਲੰਡਰ ਵਿੱਚ, ਹਰ ਇੱਕ ਤੁਹਾਡੇ ਆਪਣੇ ਦਿਸਹੱਦੇ ਤੋਂ ਜਾਂਚਿਆ, ਯਾਦ-ਦਹਾਨੀਆਂ ਨਾਲ।" },
    { icon: "makoto", eyebrow: "ਇਮੇਜ ਲੈਬ · ਪਿਕਸਲ ਨਹੀਂ, ਸਬੂਤ", title: "ਸਾਫ਼ ਤਸਵੀਰਾਂ। ਪੁਸ਼ਟ ਸੱਚ।",
      body: "ਇਹ ਸ਼ੋਰ ਹਟਾਉਂਦਾ ਹੈ, ਸੈਂਸਰ ਨੁਕਸ ਠੀਕ ਕਰਦਾ ਹੈ, ਹਰ ਤਾਰਾ, ਆਕਾਸ਼ਗੰਗਾ ਅਤੇ ਨੀਹਾਰਿਕਾ ਚਿੰਨ੍ਹਿਤ ਕਰਦਾ ਹੈ ਅਤੇ ਤੁਹਾਡੇ ਸ਼ਾਟ 'ਤੇ ਰਿਪੋਰਟ ਲਿਖਦਾ ਹੈ। ਫਿਰ ਇਕਸਾਰਤਾ ਜਾਂਚ ਸਾਬਤ ਕਰਦੀ ਹੈ ਕਿ ਕੁਝ ਵੀ ਜੋੜਿਆ, ਗੁਆਚਿਆ, ਹਿੱਲਿਆ ਜਾਂ ਫਿੱਕਾ ਨਹੀਂ ਹੋਇਆ।" },
    { icon: "meiyo", eyebrow: "ਮਿਸ਼ਨ ਲੌਗ · ਤੁਹਾਡਾ ਸਫ਼ਰ", title: "ਬਾਹਰ ਨਿਕਲੋ। ਉੱਪਰ ਵੇਖੋ। ਅੱਗੇ ਵਧੋ।",
      body: "ਜੋ ਵੇਖਿਆ ਉਹ ਦਰਜ ਕਰੋ ਅਤੇ ਅਸਮਾਨ ਪੁਸ਼ਟੀ ਕਰੇ ਤਾਂ ਮਿਸ਼ਨ ਅੰਕ ਪਾਓ। ਮੁਫ਼ਤ, ਖੁੱਲ੍ਹੇ ਵਿਗਿਆਨ ਅੰਕੜਿਆਂ 'ਤੇ ਬਣਿਆ, English, हिन्दी ਅਤੇ ਪੰਜਾਬੀ ਵਿੱਚ।" },
  ],
  stats: [["4", "ਸੰਦ ਇੱਕ ਥਾਂ"], ["3", "ਭਾਸ਼ਾਵਾਂ"], ["0", "ਨਕਲੀ ਤਾਰੇ"]],
  enter: "ਮਿਸ਼ਨ ਕੰਟਰੋਲ ਸ਼ੁਰੂ ਕਰੋ",
  guide: "ਗਾਈਡ ਪੜ੍ਹੋ",
};

export const LANDING: Record<Lang, LandingText> = { en, hi, pa, ja: en };
