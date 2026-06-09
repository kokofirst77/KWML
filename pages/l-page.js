// L단계 페이지 — 배운 것 (텍스트 입력 → AI가 SVG 광합성 모식도 생성)
Pages['l-page'] = {

    // 페이지 렌더링 — 저장된 카드 불러오기
    render(containerId) {
        const savedCard  = localStorage.getItem(App.getKey('l_card'));
        const savedText  = localStorage.getItem(App.getKey('l_text')) || '';

        document.getElementById(containerId).innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <div class="page-title">📖 L — 배운 것</div>
                <div class="page-desc">
                    실험 후 광합성에 대해 알게 된 것을 설명해보세요!<br>
                    AI가 여러분의 설명을 바탕으로 시각화 카드를 만들어드립니다.
                </div>
            </div>

            <!-- 텍스트 입력 영역 -->
            <div class="content-card">
                <label class="form-label">광합성에 대해 배운 내용을 설명해보세요</label>
                <textarea class="form-input" id="l-text" rows="5"
                          placeholder="예: 광합성은 식물의 잎에서 햇빛, 물, 이산화탄소를 이용해 포도당을 만드는 과정입니다. 엽록체에 있는 엽록소가 햇빛을 흡수하고..."
                          style="resize:vertical;min-height:120px;">${this.escapeHtml(savedText)}</textarea>
                <button class="btn-primary" id="l-generate-btn" style="margin-top:14px;">
                    🎨 시각화 카드 만들기
                </button>
            </div>

            <!-- 에러 메시지 -->
            <div id="l-error" class="error-msg" style="display:none;"></div>

            <!-- 생성된 SVG 카드 -->
            <div id="l-svg-result" style="display:${savedCard ? 'block' : 'none'};">
                <div class="svg-card-title">📊 나의 광합성 시각화 카드</div>
                <div class="svg-card" id="l-svg-box">
                    ${savedCard || ''}
                </div>
            </div>

            <button class="btn-complete" id="l-complete-btn">L단계 완료 ✓</button>
        </div>`;

        this.attachEvents();
    },

    // HTML 이스케이프
    escapeHtml(str) {
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    },

    // 이벤트 연결
    attachEvents() {
        document.getElementById('l-generate-btn')
            .addEventListener('click', () => this.generateCard());
        document.getElementById('l-complete-btn')
            .addEventListener('click', () => this.complete());
    },

    // SVG 시각화 카드 생성 (Claude API 호출)
    async generateCard() {
        const text = document.getElementById('l-text').value.trim();
        if (!text || text.length < 10) {
            document.getElementById('l-error').textContent =
                '광합성에 대해 최소 10자 이상 설명을 입력해주세요.';
            document.getElementById('l-error').style.display = 'block';
            return;
        }

        document.getElementById('l-error').style.display = 'none';

        // 버튼 비활성화 및 로딩 표시
        const btn = document.getElementById('l-generate-btn');
        btn.disabled  = true;
        btn.textContent = '⏳ AI가 카드를 만드는 중...';

        // 텍스트 저장
        localStorage.setItem(App.getKey('l_text'), text);

        // 결과 영역에 로딩 표시
        const resultEl  = document.getElementById('l-svg-result');
        const svgBox    = document.getElementById('l-svg-box');
        resultEl.style.display = 'block';
        svgBox.innerHTML = `
        <div style="text-align:center;padding:40px;color:var(--color-muted);">
            <div class="loading-dots" style="justify-content:center;margin-bottom:12px;">
                <span></span><span></span><span></span>
            </div>
            AI가 시각화 카드를 제작하고 있어요...
        </div>`;

        try {
            let svgResponse = '';
            // SVG는 길 수 있으므로 maxTokens 2048 설정
            await Claude.callClaude(
                PROMPTS.l,
                [{ role: 'user', content: text }],
                chunk => { svgResponse += chunk; },
                { maxTokens: 2048 }
            );

            // 응답에서 <svg> 태그 추출 및 안전 처리
            const svgMatch = svgResponse.match(/<svg[\s\S]*?<\/svg>/i);
            if (!svgMatch) {
                throw new Error('SVG 코드를 생성하지 못했습니다. 다시 시도해주세요.');
            }

            // script 태그 제거 (기본 보안)
            const safeSvg = svgMatch[0].replace(/<script[\s\S]*?<\/script>/gi, '');
            svgBox.innerHTML = safeSvg;

            // SVG 카드 저장
            localStorage.setItem(App.getKey('l_card'), safeSvg);

        } catch (err) {
            resultEl.style.display = 'none';
            document.getElementById('l-error').textContent =
                err.message || 'SVG 카드 생성 중 오류가 발생했습니다.';
            document.getElementById('l-error').style.display = 'block';
        } finally {
            btn.disabled    = false;
            btn.textContent = '🎨 시각화 카드 다시 만들기';
        }
    },

    // L단계 완료 처리
    complete() {
        const savedCard = localStorage.getItem(App.getKey('l_card'));
        if (!savedCard) {
            alert('먼저 시각화 카드를 만들어주세요! 🎨');
            return;
        }
        App.completeStep('l');
        App.navigate('m-page');
    }
};
