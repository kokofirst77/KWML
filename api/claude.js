// Claude API 공통 호출 모듈
const Claude = {

    // Claude API를 스트리밍 방식으로 호출하는 함수
    // systemPrompt : 이 AI의 역할·지침을 담은 문자열
    // messages     : [{role: 'user'|'assistant', content: '...'}] 형태의 대화 배열
    // onChunk      : 스트리밍 텍스트 조각을 받을 때마다 호출되는 콜백 (chunk: string) => void
    // options      : { maxTokens: 숫자 } — 기본값 1024, SVG 생성 시 2048 권장
    async callClaude(systemPrompt, messages, onChunk, options = {}) {
        const rawKey = window.KWLMLAB_CONFIG?.apiKey;

        if (!rawKey || rawKey.trim() === '') {
            throw new Error(
                'API 키가 설정되지 않았습니다. 로그인 화면 교사용 섹션에서 API 키를 입력해주세요.'
            );
        }

        // HTTP 헤더는 ISO-8859-1만 허용 — 비ASCII 문자 제거
        const apiKey = rawKey.trim().replace(/[^\x20-\x7E]/g, '');

        if (!apiKey.startsWith('sk-')) {
            throw new Error(
                'API 키 형식이 올바르지 않습니다. (sk-ant-api03-... 형태여야 합니다)\n' +
                '로그인 화면에서 API 키를 다시 입력해주세요.'
            );
        }

        const model = window.KWLMLAB_CONFIG?.model || 'claude-sonnet-4-20250514';

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey.trim(),
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: model,
                max_tokens: options.maxTokens || 1024,
                system: systemPrompt,
                messages: messages,
                stream: true
            })
        });

        if (!response.ok) {
            let errMsg = `API 오류 (${response.status})`;
            try {
                const errData = await response.json();
                if (errData.error?.message) errMsg = errData.error.message;
            } catch (_) {}
            throw new Error(errMsg);
        }

        // SSE(Server-Sent Events) 스트림 읽기
        const reader  = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const raw   = decoder.decode(value, { stream: true });
            const lines = raw.split('\n');

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (data === '[DONE]') continue;

                try {
                    const parsed = JSON.parse(data);
                    // 텍스트 델타 이벤트만 처리
                    if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                        if (onChunk) onChunk(parsed.delta.text);
                    }
                } catch (_) {
                    // JSON 파싱 실패는 무시 (불완전한 청크)
                }
            }
        }
    }
};
