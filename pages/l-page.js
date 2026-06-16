// L단계 — 배운 것 텍스트 → 개념 관계도 + AI 이미지 → 학습 카드 → Firebase 갤러리
Pages['l-page'] = {

    // 상태 변수
    _cardData: null,
    _cards: [],
    _sortMode: 'latest',

    // SVG 스타일 상수
    SVG: {
        W: 320, H: 220, R: 34,
        nodeFill:   '#E8F5E9', nodeBorder: '#2E7D32',
        centerFill: '#2E7D32', centerText: '#FFFFFF',
        nodeText:   '#1B5E20', fontSize: 12,
        edgeColor:  '#81C784', edgeWidth: 2,
        edgeLabelSize: 10, edgeLabelColor: '#546E7A'
    },

    // 이모지 ↔ Firestore 필드키 매핑 (특수문자 회피)
    EMOJIS: ['👍', '💡', '🌱'],
    EMOJI_KEYS: { '👍': 'like', '💡': 'discover', '🌱': 'relate' },
    EMOJI_LABELS: { '👍': '이해했어요', '💡': '새로운 발견', '🌱': '나도 비슷해요' },

    render(containerId) {
        this._cardData = null;
        this._cards    = [];
        this._sortMode = 'latest';

        const student    = App.getStudent();
        const draft      = localStorage.getItem('kwlmlab_l_draft') || '';
        const firebaseOk = !!window._firebaseReady;

        document.getElementById(containerId).innerHTML = `
        <div class="page-container" style="max-width:1100px;">
            <div class="page-header">
                <div class="page-title">📖 L — 오늘 배운 것을 자유롭게 적어보세요</div>
            </div>

            <!-- 입력 섹션 -->
            <div class="content-card" id="l-input-section">
                <div class="l-hint-box">
                    💡 <strong>힌트:</strong> 실험에서 발견한 것, 놀라웠던 점,
                    이전에 몰랐다가 알게 된 것을 적어보세요
                </div>
                <textarea class="form-input" id="l-text" rows="5"
                          placeholder="오늘 실험에서 발견한 것, 배운 것을 자유롭게 적어보세요"
                          style="resize:vertical;min-height:120px;margin-top:12px;">${this.escapeHtml(draft)}</textarea>
                <div id="l-char-hint" style="font-size:13px;color:#aaa;margin-top:6px;min-height:20px;"></div>
                <div style="display:flex;gap:10px;align-items:center;margin-top:10px;flex-wrap:wrap;">
                    <input class="form-input" id="l-nickname" type="text"
                           placeholder="이름 또는 닉네임"
                           style="max-width:180px;"
                           value="${this.escapeHtml(student?.name || '')}">
                    <button class="btn-primary" id="l-generate-btn" disabled
                            style="flex:1;max-width:220px;">✨ 학습 카드 만들기</button>
                </div>
                <div id="l-error" class="error-msg" style="display:none;margin-top:8px;"></div>
            </div>

            <!-- 카드 생성 결과 -->
            <div id="l-card-section" style="display:none;margin-top:16px;"></div>

            <!-- 실시간 갤러리 -->
            <div class="w-live-section" style="margin-top:24px;">
                <div class="w-live-header">
                    <span class="live-badge">🔴 LIVE</span>
                    <span style="font-weight:700;color:var(--color-primary);">🖼️ 우리 반 학습 갤러리</span>
                    <div style="margin-left:auto;display:flex;gap:8px;">
                        <button class="btn-secondary l-sort-btn active" data-sort="latest"
                                style="padding:6px 14px;font-size:13px;">최신순</button>
                        <button class="btn-secondary l-sort-btn" data-sort="reactions"
                                style="padding:6px 14px;font-size:13px;">반응 많은 순</button>
                    </div>
                </div>
                <div id="l-gallery" class="l-gallery-grid">
                    <div style="text-align:center;color:#bbb;padding:32px;grid-column:1/-1;">
                        ${firebaseOk
                            ? '갤러리를 불러오는 중...'
                            : 'Firebase 연동 시 갤러리가 활성화됩니다.'}
                    </div>
                </div>
            </div>

            <button class="btn-complete" id="l-complete-btn" style="margin-top:24px;">L단계 완료 ✓</button>
        </div>

        <!-- 상세 보기 모달 -->
        <div id="l-modal" class="l-modal-overlay" style="display:none;">
            <div class="l-modal-box">
                <button class="l-modal-close" id="l-modal-close">✕</button>
                <div id="l-modal-content"></div>
            </div>
        </div>`;

        this.attachEvents(student);
        if (firebaseOk) this.subscribeGallery(student);
    },

    attachEvents(student) {
        const textarea = document.getElementById('l-text');
        const btn      = document.getElementById('l-generate-btn');

        // 글자 수 감시 — 20자 이상이어야 버튼 활성화
        const checkLen = () => {
            const len  = textarea.value.trim().length;
            const hint = document.getElementById('l-char-hint');
            if (len < 20) {
                btn.disabled      = true;
                hint.textContent  = `조금 더 자세히 적어볼까요? (현재 ${len}자 / 최소 20자)`;
                hint.style.color  = '#e74c3c';
            } else {
                btn.disabled      = false;
                hint.textContent  = `✓ ${len}자 입력됨`;
                hint.style.color  = '#52b788';
            }
            localStorage.setItem('kwlmlab_l_draft', textarea.value);
        };
        textarea.addEventListener('input', checkLen);
        checkLen();

        btn.addEventListener('click', () => this.buildCard(student));

        // 정렬 버튼
        document.querySelectorAll('.l-sort-btn').forEach(b => {
            b.addEventListener('click', () => {
                document.querySelectorAll('.l-sort-btn').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                this._sortMode = b.dataset.sort;
                this._renderGallery(this._cards, student);
            });
        });

        // 완료 버튼
        document.getElementById('l-complete-btn').addEventListener('click', () => {
            if (!localStorage.getItem(App.getKey('l_card'))) {
                alert('먼저 학습 카드를 만들어주세요! ✨');
                return;
            }
            App.completeStep('l');
            App.navigate('m-page');
        });

        // 모달 닫기
        document.getElementById('l-modal-close').addEventListener('click', () => {
            document.getElementById('l-modal').style.display = 'none';
        });
        document.getElementById('l-modal').addEventListener('click', e => {
            if (e.target.id === 'l-modal')
                document.getElementById('l-modal').style.display = 'none';
        });
    },

    // ── 카드 생성 플로우 ─────────────────────────────────────────────
    async buildCard(student) {
        const text     = document.getElementById('l-text').value.trim();
        const nickname = document.getElementById('l-nickname').value.trim()
                         || student?.name || '학생';
        const errorEl  = document.getElementById('l-error');
        const section  = document.getElementById('l-card-section');

        errorEl.style.display = 'none';

        // 로딩 표시
        section.style.display = 'block';
        section.innerHTML = `
        <div class="content-card" style="text-align:center;padding:40px;">
            <div class="loading-dots" style="justify-content:center;margin-bottom:16px;">
                <span></span><span></span><span></span>
            </div>
            <div style="color:var(--color-muted);font-size:15px;">✨ 개념 관계도를 분석하는 중...</div>
        </div>`;

        document.getElementById('l-generate-btn').disabled = true;

        try {
            // ① Claude 1회 호출 → conceptMap + imagePrompt (JSON)
            let jsonText = '';
            await Claude.callClaude(
                PROMPTS.l_card,
                [{ role: 'user', content: text }],
                chunk => { jsonText += chunk; },
                { maxTokens: 1000 }
            );

            const clean = jsonText.replace(/```json|```/g, '').trim();
            const { conceptMap, imagePrompt } = JSON.parse(clean);

            // ② 개념 관계도 즉시 렌더링 → 카드 UI 표시 (이미지는 스켈레톤)
            const conceptSvg = this.renderConceptMap(conceptMap);
            section.innerHTML = this.buildCardHTML(nickname, text, conceptSvg);
            document.getElementById('l-share-btn')
                ?.addEventListener('click', () => this.saveToFirebase(student));

            // ③ SVG 이미지 생성
            let svgText = '';
            await Claude.callClaude(
                PROMPTS.l_img,
                [{ role: 'user', content: imagePrompt }],
                chunk => { svgText += chunk; },
                { maxTokens: 2048 }
            );

            const svgMatch = svgText.match(/<svg[\s\S]*?<\/svg>/i);
            const safeSvg  = svgMatch
                ? svgMatch[0]
                    .replace(/<script[\s\S]*?<\/script>/gi, '')
                    .replace(/\bon\w+="[^"]*"/gi, '')
                : this._fallbackSvg();

            // ④ 이미지 영역 업데이트
            const imgCol = document.getElementById('l-img-col');
            if (imgCol) imgCol.innerHTML = safeSvg;

            // ⑤ 카드 데이터 저장 + 공유 버튼 활성화
            this._cardData = { nickname, text, conceptMap, svgImage: safeSvg };
            localStorage.setItem(App.getKey('l_card'), JSON.stringify({ nickname, text }));

            const shareBtn = document.getElementById('l-share-btn');
            if (shareBtn) shareBtn.disabled = false;

        } catch (err) {
            section.innerHTML = '';
            errorEl.textContent = '카드 생성 오류: ' + (err.message || '다시 시도해주세요.');
            errorEl.style.display = 'block';
        } finally {
            const b = document.getElementById('l-generate-btn');
            if (b) b.disabled = false;
        }
    },

    // 학습 카드 HTML 템플릿
    buildCardHTML(nickname, text, conceptSvg) {
        return `
        <div class="content-card l-my-card">
            <div class="l-card-header">🌿 ${this.escapeHtml(nickname)}의 학습 카드</div>
            <div class="l-card-body">
                <div class="l-card-img-col" id="l-img-col">
                    <div class="l-img-skeleton">
                        <div class="loading-dots" style="justify-content:center;margin-bottom:8px;">
                            <span></span><span></span><span></span>
                        </div>
                        <div style="font-size:12px;color:#bbb;">🎨 이미지를 그리는 중...</div>
                    </div>
                </div>
                <div class="l-card-map-col">${conceptSvg}</div>
            </div>
            <div class="l-card-quote">"${this.escapeHtml(text.slice(0, 120))}${text.length > 120 ? '...' : ''}"</div>
            <div class="l-card-footer">
                <div class="l-reactions">
                    <span class="l-react-display">👍 0</span>
                    <span class="l-react-display">💡 0</span>
                    <span class="l-react-display">🌱 0</span>
                </div>
                <button class="btn-primary" id="l-share-btn" disabled
                        style="padding:10px 20px;font-size:14px;">
                    📤 갤러리에 공유하기
                </button>
            </div>
        </div>`;
    },

    _fallbackSvg() {
        return `<svg viewBox="0 0 320 220" xmlns="http://www.w3.org/2000/svg">
            <rect width="320" height="220" fill="#f0f7ee" rx="10"/>
            <text x="160" y="115" text-anchor="middle" fill="#52b788"
                  font-size="14" font-family="sans-serif">이미지 생성 실패</text>
        </svg>`;
    },

    // ── 개념 관계도 SVG 렌더링 ────────────────────────────────────────
    renderConceptMap(conceptMap) {
        if (!conceptMap?.nodes) return '';
        const { layoutType, nodes, edges } = conceptMap;
        let positioned;
        if (layoutType === 'radial')        positioned = this._calcRadial(nodes);
        else if (layoutType === 'network')  positioned = this._calcNetwork(nodes);
        else                                positioned = this._calcLinear(nodes);
        return this._drawSVG(positioned, edges || []);
    },

    _calcLinear(nodes) {
        const { W, H } = this.SVG;
        const gap = W / (nodes.length + 1);
        return nodes.map((n, i) => ({ ...n, x: gap * (i + 1), y: H / 2 }));
    },

    _calcRadial(nodes) {
        const { W, H } = this.SVG;
        const cx = W / 2, cy = H / 2, r = 75;
        const center = nodes.find(n => n.isCenter) || nodes[0];
        const others = nodes.filter(n => n.id !== center.id);
        const out = others.map((n, i) => {
            const angle = (2 * Math.PI * i) / others.length - Math.PI / 2;
            return { ...n, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
        });
        return [{ ...center, x: cx, y: cy }, ...out];
    },

    _calcNetwork(nodes) {
        const { W, H } = this.SVG;
        const cols = Math.ceil(Math.sqrt(nodes.length));
        const rows = Math.ceil(nodes.length / cols);
        const gx = W / (cols + 1), gy = H / (rows + 1);
        return nodes.map((n, i) => ({
            ...n,
            x: gx * ((i % cols) + 1),
            y: gy * (Math.floor(i / cols) + 1)
        }));
    },

    _drawSVG(nodes, edges) {
        const s = this.SVG;
        const pos = {};
        nodes.forEach(n => { pos[n.id] = { x: n.x, y: n.y }; });

        // 화살표 마커 정의 (엣지별 고유 id로 겹침 방지)
        let defs = '';
        let edgesSvg = '';
        edges.forEach((e, ei) => {
            const from = pos[e.from], to = pos[e.to];
            if (!from || !to) return;
            const dx = to.x - from.x, dy = to.y - from.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const x1 = from.x + dx / dist * s.R;
            const y1 = from.y + dy / dist * s.R;
            const x2 = to.x   - dx / dist * s.R;
            const y2 = to.y   - dy / dist * s.R;
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
            const mid = `m${ei}`;

            defs += `<marker id="${mid}" markerWidth="8" markerHeight="6"
                refX="7" refY="3" orient="auto">
                <polygon points="0 0,8 3,0 6" fill="${s.edgeColor}"/>
            </marker>`;

            edgesSvg += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}"
                               x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"
                               stroke="${s.edgeColor}" stroke-width="${s.edgeWidth}"
                               marker-end="url(#${mid})"/>`;
            if (e.label) {
                edgesSvg += `<text x="${mx.toFixed(1)}" y="${(my - 5).toFixed(1)}"
                    text-anchor="middle" font-size="${s.edgeLabelSize}"
                    fill="${s.edgeLabelColor}"
                    font-family="'Noto Sans KR',sans-serif">${this.escapeHtml(e.label)}</text>`;
            }
        });

        let nodesSvg = '';
        nodes.forEach(n => {
            const fill  = n.isCenter ? s.centerFill : s.nodeFill;
            const tFill = n.isCenter ? s.centerText  : s.nodeText;
            const lines = this._wrap(n.label || '', 7);
            const lh    = s.fontSize + 3;
            const oy    = -(lines.length - 1) * lh / 2;

            nodesSvg += `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${s.R}"
                fill="${fill}" stroke="${s.nodeBorder}" stroke-width="2"/>`;
            lines.forEach((line, i) => {
                nodesSvg += `<text x="${n.x.toFixed(1)}" y="${(n.y + oy + i * lh + 4).toFixed(1)}"
                    text-anchor="middle" font-size="${s.fontSize}"
                    fill="${tFill}" font-weight="700"
                    font-family="'Noto Sans KR',sans-serif">${this.escapeHtml(line)}</text>`;
            });
        });

        return `<svg viewBox="0 0 ${s.W} ${s.H}" xmlns="http://www.w3.org/2000/svg"
                     style="width:100%;max-width:${s.W}px;height:auto;display:block;">
                 <defs>${defs}</defs>
                 ${edgesSvg}${nodesSvg}
                </svg>`;
    },

    _wrap(text, max) {
        if (!text || text.length <= max) return [text || ''];
        const lines = [];
        for (let i = 0; i < text.length; i += max) lines.push(text.slice(i, i + max));
        return lines;
    },

    // ── Firebase 갤러리 ───────────────────────────────────────────────
    async saveToFirebase(student) {
        if (!window._firebaseReady || !this._cardData) return;
        const shareBtn = document.getElementById('l-share-btn');
        if (shareBtn) { shareBtn.disabled = true; shareBtn.textContent = '저장 중...'; }

        try {
            const { collection, addDoc } = window._firestoreFns;
            const d = this._cardData;
            const reactions  = { like: 0, discover: 0, relate: 0 };
            const reactedBy  = { like: [], discover: [], relate: [] };

            await addDoc(collection(window._db, 'l_cards'), {
                studentName:   d.nickname,
                studentClass:  student?.class  || '',
                studentNumber: student?.number || '',
                studentText:   d.text,
                svgImage:      d.svgImage,
                conceptMap:    d.conceptMap,
                reactions,
                reactedBy,
                timestamp: Date.now()
            });
            if (shareBtn) { shareBtn.textContent = '✅ 공유 완료!'; }
        } catch (e) {
            if (shareBtn) { shareBtn.disabled = false; shareBtn.textContent = '📤 갤러리에 공유하기'; }
            const errEl = document.getElementById('l-error');
            if (errEl) { errEl.textContent = '공유 실패: ' + e.message; errEl.style.display = 'block'; }
        }
    },

    subscribeGallery(student) {
        if (!window._firebaseReady) return;
        const { collection, onSnapshot } = window._firestoreFns;
        const unsub = onSnapshot(
            collection(window._db, 'l_cards'),
            snap => {
                this._cards = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                this._renderGallery(this._cards, student);
            },
            err => { console.warn('갤러리 구독 오류:', err); }
        );
        window._pageUnsubscribe = unsub;
    },

    _renderGallery(cards, student) {
        const myName = student?.name || '';
        const sorted = [...cards].sort((a, b) => {
            if (this._sortMode === 'reactions') {
                const sum = c => Object.values(c.reactions || {}).reduce((s, v) => s + (v || 0), 0);
                return sum(b) - sum(a);
            }
            return (b.timestamp || 0) - (a.timestamp || 0);
        });

        const gallery = document.getElementById('l-gallery');
        if (!gallery) return;

        if (sorted.length === 0) {
            gallery.innerHTML = `<div style="text-align:center;color:#bbb;padding:32px;grid-column:1/-1;">
                아직 공유된 카드가 없습니다. 첫 번째 카드를 공유해보세요!
            </div>`;
            return;
        }

        gallery.innerHTML = sorted.map(card => {
            const isMine = card.studentName === myName;
            const r  = card.reactions  || { like: 0, discover: 0, relate: 0 };
            const rb = card.reactedBy  || { like: [], discover: [], relate: [] };

            const reactBtns = this.EMOJIS.map(emoji => {
                const key     = this.EMOJI_KEYS[emoji];
                const count   = r[key] || 0;
                const reacted = (rb[key] || []).includes(myName);
                const off     = isMine || !myName;
                return `<button class="feed-like-btn${reacted ? ' liked' : ''}"
                                data-cid="${card.id}" data-emoji="${emoji}"
                                ${off ? 'disabled' : ''}
                                title="${isMine ? '내 카드에는 반응할 수 없어요' : ''}">
                            ${emoji} ${count}
                        </button>`;
            }).join('');

            return `
            <div class="l-gallery-card${isMine ? ' l-gallery-card-mine' : ''}"
                 data-id="${card.id}" tabindex="0">
                <div class="l-gallery-card-header">🌿 ${this.escapeHtml(card.studentName || '?')}</div>
                <div class="l-gallery-img-area">
                    ${card.svgImage || '<div class="l-no-img">이미지 없음</div>'}
                </div>
                <div class="l-gallery-map-area">
                    ${card.conceptMap ? this.renderConceptMap(card.conceptMap) : ''}
                </div>
                <div class="l-gallery-quote">"${this.escapeHtml((card.studentText || '').slice(0, 60))}..."</div>
                <div class="l-card-footer" style="padding:0 2px 2px;">
                    ${reactBtns}
                </div>
            </div>`;
        }).join('');

        // 이모지 버튼 이벤트
        gallery.querySelectorAll('.feed-like-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                this.toggleReaction(btn.dataset.cid, btn.dataset.emoji, myName);
            });
        });

        // 카드 클릭 → 모달
        gallery.querySelectorAll('.l-gallery-card').forEach(card => {
            card.addEventListener('click', e => {
                if (e.target.closest('.feed-like-btn')) return;
                const data = sorted.find(c => c.id === card.dataset.id);
                if (data) this.showModal(data, myName);
            });
        });
    },

    async toggleReaction(cardId, emoji, myName) {
        if (!window._firebaseReady || !myName) return;
        const key = this.EMOJI_KEYS[emoji];
        const { doc, getDoc, updateDoc, increment, arrayUnion, arrayRemove } = window._firestoreFns;
        const ref = doc(window._db, 'l_cards', cardId);
        try {
            const snap   = await getDoc(ref);
            if (!snap.exists()) return;
            const reacted = (snap.data().reactedBy?.[key] || []).includes(myName);
            if (reacted) {
                await updateDoc(ref, {
                    [`reactions.${key}`]: increment(-1),
                    [`reactedBy.${key}`]: arrayRemove(myName)
                });
            } else {
                await updateDoc(ref, {
                    [`reactions.${key}`]: increment(1),
                    [`reactedBy.${key}`]: arrayUnion(myName)
                });
            }
        } catch (e) { console.warn('반응 처리 실패:', e); }
    },

    showModal(card, myName) {
        const r  = card.reactions  || { like: 0, discover: 0, relate: 0 };
        const rb = card.reactedBy  || { like: [], discover: [], relate: [] };
        const isMine = card.studentName === myName;

        const reactBtns = this.EMOJIS.map(emoji => {
            const key     = this.EMOJI_KEYS[emoji];
            const count   = r[key] || 0;
            const reacted = (rb[key] || []).includes(myName);
            const off     = isMine || !myName;
            return `<div class="l-modal-react-item">
                <button class="feed-like-btn${reacted ? ' liked' : ''} l-modal-react-btn"
                        data-cid="${card.id}" data-emoji="${emoji}"
                        ${off ? 'disabled' : ''}>
                    ${emoji} ${count}
                </button>
                <div style="font-size:12px;color:#888;margin-top:4px;">
                    ${this.EMOJI_LABELS[emoji]}
                </div>
            </div>`;
        }).join('');

        document.getElementById('l-modal-content').innerHTML = `
        <div class="l-modal-header">🌿 ${this.escapeHtml(card.studentName || '?')}의 학습 카드</div>
        <div class="l-modal-body">
            <div class="l-modal-img">${card.svgImage || ''}</div>
            <div class="l-modal-map">
                ${card.conceptMap ? this.renderConceptMap(card.conceptMap) : ''}
            </div>
        </div>
        <div class="l-modal-quote">"${this.escapeHtml(card.studentText || '')}"</div>
        <div class="l-modal-reactions">${reactBtns}</div>`;

        // 모달 내 이모지 버튼 이벤트
        document.querySelectorAll('.l-modal-react-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', () => {
                this.toggleReaction(btn.dataset.cid, btn.dataset.emoji, myName);
                document.getElementById('l-modal').style.display = 'none';
            });
        });

        document.getElementById('l-modal').style.display = 'flex';
    },

    escapeHtml(str) {
        return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
};
