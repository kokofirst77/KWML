// 교사 대시보드 — 학급 전체 현황 모니터링
Pages.dashboard = {

    // 페이지 렌더링
    render(containerId) {
        const data = this.collectAllData();

        document.getElementById(containerId).innerHTML = `
        <div class="dashboard-wrapper">
            <div class="dashboard-header">
                <div class="dashboard-title">📊 교사 대시보드 — KWLM Lab</div>
                <div style="display:flex;gap:10px;">
                    <button class="btn-secondary" id="dash-refresh-btn"
                            style="width:auto;padding:10px 20px;">🔄 새로고침</button>
                    <button class="btn-secondary" id="dash-logout-btn"
                            style="width:auto;padding:10px 20px;">← 나가기</button>
                </div>
            </div>

            <!-- 현황 카드 (상단) -->
            <div class="stat-cards">
                ${this.buildStatCards(data)}
            </div>

            <!-- W단계 인지갈등 사진 설정 (Firebase 연동 시 활성화) -->
            <div class="dashboard-section">
                <div class="dashboard-section-title">🖼️ W단계 — 인지갈등 사진 설정</div>
                <div class="dashboard-section-body">
                    ${window._firebaseReady
                        ? this.buildPhotoUpload()
                        : '<p style="color:#aaa;font-size:14px;">Firebase 설정 후 사진 업로드 기능이 활성화됩니다.</p>'}
                </div>
            </div>

            <!-- 오개념 키워드 섹션 -->
            <div class="dashboard-section">
                <div class="dashboard-section-title">🧠 K단계 — 자주 등장한 키워드 (오개념 탐지)</div>
                <div class="dashboard-section-body">
                    ${this.buildKKeywords(data)}
                </div>
            </div>

            <!-- W단계 질문 카테고리 차트 -->
            <div class="dashboard-section">
                <div class="dashboard-section-title">📊 W단계 — 질문 카테고리 분포</div>
                <div class="dashboard-section-body" id="dash-w-chart">
                    ${this.buildWChart(data)}
                </div>
            </div>

            <!-- W단계 질문 목록 섹션 -->
            <div class="dashboard-section">
                <div class="dashboard-section-title">❓ W단계 — 학생 질문 모음</div>
                <div class="dashboard-section-body">
                    ${this.buildWQuestions(data)}
                </div>
            </div>

            <!-- 학생별 현황 테이블 -->
            <div class="dashboard-section">
                <div class="dashboard-section-title">👥 학생별 진행 현황</div>
                <div style="overflow-x:auto;">
                    ${this.buildStudentTable(data)}
                </div>
            </div>

            <p style="text-align:center;color:#bbb;font-size:12px;margin-top:28px;">
                ℹ️ 이 기기(브라우저)에서 로그인한 학생의 데이터만 표시됩니다.
            </p>
        </div>`;

        document.getElementById('dash-refresh-btn')
            .addEventListener('click', () => Pages.dashboard.render(containerId));
        document.getElementById('dash-logout-btn')
            .addEventListener('click', () => App.navigate('login'));

        // 사진 업로드 이벤트 연결
        if (window._firebaseReady) {
            const fileInput = document.getElementById('dash-photo-file');
            const saveBtn   = document.getElementById('dash-photo-save');
            if (fileInput) {
                fileInput.addEventListener('change', e => this.previewPhoto(e));
            }
            if (saveBtn) {
                saveBtn.addEventListener('click', () => this.uploadPhoto());
            }
            this.loadCurrentPhoto();  // 현재 사진 미리보기 로드
        }
    },

    // localStorage에서 모든 학생 데이터 수집
    collectAllData() {
        const students   = [];
        const kMessages  = [];   // K단계 모든 메시지 content
        const wQuestions = [];   // W단계 모든 질문

        // kwlmlab_student_ 로 시작하는 키 또는 일반 student 키 탐색
        const studentKeys = new Set();

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;

            // 학생별 K 데이터에서 반·번호 추출 (새 형식 + 구 형식 모두 지원)
            const kMatch  = key.match(/^kwlmlab_k_(\d+)_(\d+)$/);
            const keMatch = key.match(/^kwlmlab_k_entries_(\d+)_(\d+)$/);
            if (kMatch)  studentKeys.add(`${kMatch[1]}_${kMatch[2]}`);
            if (keMatch) studentKeys.add(`${keMatch[1]}_${keMatch[2]}`);

            // 학생별 W 데이터에서 반·번호 추출
            const wMatch = key.match(/^kwlmlab_w_(\d+)_(\d+)$/);
            if (wMatch) studentKeys.add(`${wMatch[1]}_${wMatch[2]}`);

            // M 데이터
            const mMatch = key.match(/^kwlmlab_m_(\d+)_(\d+)$/);
            if (mMatch) studentKeys.add(`${mMatch[1]}_${mMatch[2]}`);

            // L 카드 데이터
            const lMatch = key.match(/^kwlmlab_l_card_(\d+)_(\d+)$/);
            if (lMatch) studentKeys.add(`${lMatch[1]}_${lMatch[2]}`);
        }

        // 현재 로그인된 학생도 포함
        const currentStudent = App.getStudent();
        if (currentStudent) studentKeys.add(`${currentStudent.class}_${currentStudent.number}`);

        // 각 학생의 데이터 수집
        studentKeys.forEach(ck => {
            const [cls, num] = ck.split('_');

            // 학생 이름 (로그인 세션이나 저장 데이터에서 가져옴)
            let name = '-';
            if (currentStudent && currentStudent.class == cls && currentStudent.number == num) {
                name = currentStudent.name;
            }

            // 각 단계 완료 여부 (새 형식 우선, 구 형식 fallback)
            const kEntriesData = localStorage.getItem(`kwlmlab_k_entries_${cls}_${num}`);
            const kOldData     = localStorage.getItem(`kwlmlab_k_${cls}_${num}`);
            const kData        = kEntriesData || kOldData;
            const wData        = localStorage.getItem(`kwlmlab_w_${cls}_${num}`);
            const lData        = localStorage.getItem(`kwlmlab_l_card_${cls}_${num}`);
            const mData        = localStorage.getItem(`kwlmlab_m_${cls}_${num}`);

            students.push({
                class: cls, number: num, name,
                kDone: !!kData,
                wDone: !!wData || !!localStorage.getItem(`kwlmlab_w_submitted_${cls}_${num}`),
                lDone: !!lData,
                mDone: !!mData
            });

            // K 입력 내역 수집 (새 형식: entries 배열, 구 형식: messages 배열)
            if (kEntriesData) {
                try {
                    const entries = JSON.parse(kEntriesData);
                    entries.forEach(e => kMessages.push(e.studentInput));
                } catch (_) {}
            } else if (kOldData) {
                try {
                    const msgs = JSON.parse(kOldData);
                    msgs.filter(m => m.role === 'user').forEach(m => kMessages.push(m.content));
                } catch (_) {}
            }

            // W 질문 수집 (localStorage 방식)
            if (wData) {
                try {
                    const qs = JSON.parse(wData);
                    qs.forEach(q => wQuestions.push({ cls, num, q }));
                } catch (_) {}
            }
        });

        // 반·번호 순 정렬
        students.sort((a, b) => {
            if (a.class !== b.class) return parseInt(a.class) - parseInt(b.class);
            return parseInt(a.number) - parseInt(b.number);
        });

        return { students, kMessages, wQuestions };
    },

    // 현황 카드 5개 (전체·K·W·L·M 완료 수)
    buildStatCards(data) {
        const total   = data.students.length;
        const kCount  = data.students.filter(s => s.kDone).length;
        const wCount  = data.students.filter(s => s.wDone).length;
        const lCount  = data.students.filter(s => s.lDone).length;
        const mCount  = data.students.filter(s => s.mDone).length;

        return [
            { label: '참여 학생', value: total, icon: '👥' },
            { label: 'K 완료',   value: kCount, icon: '💡' },
            { label: 'W 완료',   value: wCount, icon: '❓' },
            { label: 'L 완료',   value: lCount, icon: '📖' },
            { label: 'M 완료',   value: mCount, icon: '🔍' }
        ].map(({ label, value, icon }) => `
        <div class="stat-card">
            <div style="font-size:28px;margin-bottom:6px;">${icon}</div>
            <div class="stat-card-value">${value}</div>
            <div class="stat-card-label">${label}</div>
        </div>`).join('');
    },

    // K단계 메시지에서 자주 등장한 키워드 목록
    buildKKeywords(data) {
        if (data.kMessages.length === 0) {
            return '<p style="color:#bbb;font-size:14px;">아직 K단계 데이터가 없습니다.</p>';
        }

        // 키워드 빈도 계산 (Wordcloud 컴포넌트 재활용)
        const freq = {};
        data.kMessages.forEach(msg => {
            Wordcloud.extractKeywords(msg).forEach(w => {
                freq[w] = (freq[w] || 0) + 1;
            });
        });

        const top = Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20);

        if (top.length === 0) {
            return '<p style="color:#bbb;font-size:14px;">분석된 키워드가 없습니다.</p>';
        }

        return `<div style="display:flex;flex-wrap:wrap;gap:8px;">` +
            top.map(([word, count]) =>
                `<span class="keyword-tag" title="${count}회 등장">
                     ${word} <strong style="color:var(--color-primary);">(${count})</strong>
                 </span>`
            ).join('') +
            `</div>`;
    },

    // W단계 질문을 카테고리로 분류 (키워드 규칙 기반)
    classifyQuestion(q) {
        const t = q.toLowerCase();
        if (/재료|필요|조건|물\b|햇빛|빛|이산화탄소|co2|산소|o2|포도당|엽록소|영양/.test(t)) return '재료/조건';
        if (/어떻게|과정|원리|방법|이유|왜|메커니즘|반응|화학/.test(t))               return '과정/원리';
        if (/결과|산물|만들|생성|나오|생기|무엇이/.test(t))                          return '결과/산물';
        if (/어디|장소|잎|엽록체|세포|위치|구조/.test(t))                            return '장소/구조';
        if (/실생활|응용|활용|중요|사람|우리|환경|농업|음식/.test(t))                 return '응용/생활';
        return '기타';
    },

    // W단계 카테고리별 막대 차트 생성
    buildWChart(data) {
        if (data.wQuestions.length === 0) {
            return '<p style="color:#bbb;font-size:14px;">아직 W단계 데이터가 없습니다.</p>';
        }

        const categories = ['재료/조건', '과정/원리', '결과/산물', '장소/구조', '응용/생활', '기타'];
        const counts     = {};
        categories.forEach(c => { counts[c] = 0; });

        data.wQuestions.forEach(({ q }) => {
            const cat = this.classifyQuestion(q);
            counts[cat] = (counts[cat] || 0) + 1;
        });

        const max = Math.max(...Object.values(counts), 1);
        const colors = ['#2d6a4f','#40916c','#52b788','#74c69d','#95d5b2','#b7e4c7'];

        return `<div class="chart-container">` +
            categories
                .filter(c => counts[c] > 0)
                .map((c, i) => {
                    const pct = Math.round((counts[c] / max) * 100);
                    return `
                    <div class="chart-bar-row">
                        <div class="chart-bar-label">${c}</div>
                        <div class="chart-bar-track">
                            <div class="chart-bar-fill" style="width:${pct}%;background:${colors[i % colors.length]};">
                                <span class="chart-bar-count">${counts[c]}개</span>
                            </div>
                        </div>
                    </div>`;
                }).join('') +
            `</div>`;
    },

    // W단계 질문 목록
    buildWQuestions(data) {
        if (data.wQuestions.length === 0) {
            return '<p style="color:#bbb;font-size:14px;">아직 W단계 데이터가 없습니다.</p>';
        }

        return `<ul class="question-list">` +
            data.wQuestions.map(({ cls, num, q }) =>
                `<li class="question-item">
                     <span>❓ ${this.escapeHtml(q)}</span>
                     <span style="font-size:12px;color:#aaa;">${cls}반 ${num}번</span>
                 </li>`
            ).join('') +
            `</ul>`;
    },

    // 학생별 현황 테이블
    buildStudentTable(data) {
        if (data.students.length === 0) {
            return `<div class="coming-soon">
                        <div class="coming-soon-icon">📭</div>
                        <div class="coming-soon-title">아직 학생 데이터가 없습니다</div>
                        <div class="coming-soon-desc">학생들이 이 기기에서 로그인하면 현황이 표시됩니다.</div>
                    </div>`;
        }

        const rows = data.students.map(s => {
            const badge = done =>
                `<span class="step-badge ${done ? 'done' : 'not-done'}">${done ? '✅' : '⬜'}</span>`;

            return `<tr>
                <td>${s.class}반</td>
                <td>${s.number}번</td>
                <td>${s.name}</td>
                <td>${badge(s.kDone)}</td>
                <td>${badge(s.wDone)}</td>
                <td>${badge(s.lDone)}</td>
                <td>${badge(s.mDone)}</td>
            </tr>`;
        }).join('');

        return `
        <table class="student-table">
            <thead>
                <tr>
                    <th>반</th><th>번호</th><th>이름</th>
                    <th>K</th><th>W</th><th>L</th><th>M</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;
    },

    // W단계 사진 업로드 섹션 HTML 생성
    buildPhotoUpload() {
        return `
        <div style="display:flex;align-items:flex-start;gap:24px;flex-wrap:wrap;">
            <div>
                <div id="dash-photo-preview" style="width:200px;height:140px;background:#f4f4f4;
                     border:2px dashed var(--color-border);border-radius:12px;
                     display:flex;align-items:center;justify-content:center;
                     overflow:hidden;margin-bottom:10px;">
                    <span style="color:#bbb;font-size:13px;">현재 사진 없음</span>
                </div>
                <input type="file" id="dash-photo-file" accept="image/*"
                       style="display:none;">
                <button class="btn-secondary" style="width:200px;margin-bottom:8px;"
                        onclick="document.getElementById('dash-photo-file').click()">
                    📁 사진 선택
                </button>
            </div>
            <div style="flex:1;min-width:220px;">
                <div style="font-size:13px;font-weight:600;color:var(--color-primary);margin-bottom:6px;">
                    안내 문구 (선택)
                </div>
                <input class="form-input" id="dash-guide-text" type="text"
                       placeholder="이 사진을 보고 궁금한 점을 적어보세요."
                       style="margin-bottom:10px;">
                <button class="btn-primary" id="dash-photo-save"
                        style="width:auto;padding:12px 28px;">
                    💾 저장하기
                </button>
                <div id="dash-photo-status" style="margin-top:8px;font-size:13px;color:#999;"></div>
            </div>
        </div>`;
    },

    // 현재 등록된 사진 로드
    async loadCurrentPhoto() {
        if (!window._firebaseReady) return;
        const { doc, getDoc } = window._firestoreFns;
        try {
            const snap = await getDoc(doc(window._db, 'settings', 'wStage'));
            if (snap.exists() && snap.data().imageUrl) {
                const preview = document.getElementById('dash-photo-preview');
                if (preview) {
                    preview.innerHTML = `<img src="${snap.data().imageUrl}" alt="현재 사진"
                        style="width:100%;height:100%;object-fit:cover;">`;
                }
                const guideInput = document.getElementById('dash-guide-text');
                if (guideInput && snap.data().guideText) {
                    guideInput.value = snap.data().guideText;
                }
            }
        } catch (e) { console.warn('현재 사진 로드 실패:', e); }
    },

    // 파일 선택 시 미리보기
    previewPhoto(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            const preview = document.getElementById('dash-photo-preview');
            if (preview) {
                preview.innerHTML = `<img src="${e.target.result}" alt="미리보기"
                    style="width:100%;height:100%;object-fit:cover;">`;
            }
        };
        reader.readAsDataURL(file);
    },

    // 사진 Firebase Storage 업로드 후 Firestore에 URL 저장
    async uploadPhoto() {
        if (!window._firebaseReady) return;
        const fileInput = document.getElementById('dash-photo-file');
        const guideText = (document.getElementById('dash-guide-text')?.value || '').trim();
        const statusEl  = document.getElementById('dash-photo-status');
        const file      = fileInput?.files?.[0];

        if (!file && !guideText) {
            if (statusEl) { statusEl.textContent = '사진이나 안내 문구를 입력해주세요.'; statusEl.style.color = '#e74c3c'; }
            return;
        }

        if (statusEl) { statusEl.textContent = '업로드 중...'; statusEl.style.color = '#999'; }
        document.getElementById('dash-photo-save').disabled = true;

        try {
            const { doc, setDoc } = window._firestoreFns;
            let imageUrl = null;

            if (file) {
                const { ref, uploadBytes, getDownloadURL } = window._storageFns;
                const storageRef = ref(window._storage, 'w-stage/teacher-image');
                await uploadBytes(storageRef, file);
                imageUrl = await getDownloadURL(storageRef);
            } else {
                // 사진 없이 안내 문구만 업데이트 — 기존 URL 유지
                const { getDoc } = window._firestoreFns;
                const snap = await getDoc(doc(window._db, 'settings', 'wStage'));
                if (snap.exists()) imageUrl = snap.data().imageUrl || null;
            }

            await setDoc(doc(window._db, 'settings', 'wStage'), {
                imageUrl:  imageUrl || '',
                guideText: guideText || '이 사진을 보고 궁금한 점을 적어보세요.',
                updatedAt: Date.now()
            });

            if (statusEl) { statusEl.textContent = '✅ 저장 완료! W단계 화면에 바로 반영됩니다.'; statusEl.style.color = '#2d6a4f'; }
        } catch (e) {
            if (statusEl) { statusEl.textContent = '업로드 실패: ' + e.message; statusEl.style.color = '#e74c3c'; }
        } finally {
            document.getElementById('dash-photo-save').disabled = false;
        }
    },

    // HTML 이스케이프
    escapeHtml(str) {
        return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
};
