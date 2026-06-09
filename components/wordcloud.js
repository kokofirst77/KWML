// 워드클라우드 컴포넌트 — W단계 질문들의 키워드 빈도 시각화
const Wordcloud = {

    // 모든 학생의 W단계 질문을 localStorage에서 읽어 키워드 빈도 계산
    getKeywordFrequency() {
        const allWords = {};

        // kwlmlab_w_ 로 시작하는 모든 키 탐색
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith('kwlmlab_w_')) continue;

            try {
                const questions = JSON.parse(localStorage.getItem(key)) || [];
                questions.forEach(q => {
                    this.extractKeywords(q).forEach(word => {
                        allWords[word] = (allWords[word] || 0) + 1;
                    });
                });
            } catch (_) {}
        }

        return allWords;
    },

    // 문장에서 의미 있는 키워드 추출 (조사·불용어 제거)
    extractKeywords(text) {
        // 문장 부호 및 특수문자 제거 후 공백 기준 분리
        const words = text
            .replace(/[.,!?~\-+*()[\]{}'"「」『』…。]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 0);

        // 제거할 조사·어미·불용어 목록 (긴 것부터 순서대로)
        const stopSuffixes = [
            '이에요','에요','이다','이고','이나','이랑','에서','으로',
            '에게','보다','처럼','부터','까지','이야','인가','은가',
            '나요','가요','할까','일까','인지','은지','은','는','이',
            '가','을','를','의','에','도','로','과','와','랑','만','요'
        ];
        const stopWords = new Set([
            '광합성','뭔가','무엇','어떻게','왜','언제','어디','누가','무슨',
            '어떤','이런','저런','그런','그냥','정말','그래','그리고','하지만',
            '그러면','그럼','만약','혹시','아마','너무','아주','매우','정말',
            '은지','것','수','때','더','많이','같은','있는','없는','하는'
        ]);

        return words
            .map(word => {
                // 앞뒤 불필요한 문자 제거
                let w = word.replace(/^[ㄱ-ㅎㅏ-ㅣ]+|[ㄱ-ㅎㅏ-ㅣ]+$/g, '');
                // 긴 조사부터 순서대로 제거
                for (const suffix of stopSuffixes) {
                    if (w.endsWith(suffix) && w.length > suffix.length + 1) {
                        w = w.slice(0, -suffix.length);
                        break;
                    }
                }
                return w;
            })
            .filter(w => w.length >= 2 && !stopWords.has(w));
    },

    // 워드클라우드 HTML 생성 (빈도 비례 폰트 크기)
    render() {
        const freq = this.getKeywordFrequency();
        const entries = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 40);

        if (entries.length === 0) {
            return `<div class="wordcloud">
                        <span style="color:#bbb;font-size:14px;">아직 질문이 없어요. 친구들이 질문을 입력하면 여기에 표시됩니다!</span>
                    </div>`;
        }

        const maxCount = entries[0][1];
        // 빈도에 따라 폰트 크기 14px ~ 38px 범위로 선형 보간
        const colors = ['#2d6a4f','#40916c','#52b788','#74c69d','#1b4332'];

        const wordsHtml = entries.map(([word, count], idx) => {
            const ratio    = maxCount > 1 ? (count - 1) / (maxCount - 1) : 1;
            const fontSize = Math.round(14 + ratio * 24);
            const color    = colors[idx % colors.length];
            return `<span class="wc-word" style="font-size:${fontSize}px;color:${color};"
                          title="${count}회">${word}</span>`;
        }).join('');

        return `<div class="wordcloud">${wordsHtml}</div>`;
    }
};
