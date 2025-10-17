import React from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

type Props = {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
};

export default function MarkdownEditor({ value, onChange, placeholder }: Props) {
    const [mode, setMode] = React.useState<"edit" | "preview">("edit");

    const taRef = React.useRef<HTMLTextAreaElement | null>(null);
    React.useEffect(() => {
        const el = taRef.current;
        if (!el) return;
        el.style.height = "0px";
        el.style.height = Math.max(220, el.scrollHeight) + "px";
    }, [value, mode]);

    const html = React.useMemo(() => {
        const raw = marked.parse(value || "");
        return DOMPurify.sanitize(typeof raw === "string" ? raw : raw.toString());
    }, [value]);

    return (
        <div className="w-full">
            {/* 탭 */}
            <div className="flex items-center gap-2 mb-2">
                <button
                    type="button"
                    onClick={() => setMode("edit")}
                    className={`h-8 px-3 rounded-md text-sm ${mode === "edit" ? "bg-[#EEF2FF] text-[#1F2937]" : "text-[#6B7280] hover:bg-slate-100"}`}
                >
                    쓰기
                </button>
                <button
                    type="button"
                    onClick={() => setMode("preview")}
                    className={`h-8 px-3 rounded-md text-sm ${mode === "preview" ? "bg-[#EEF2FF] text-[#1F2937]" : "text-[#6B7280] hover:bg-slate-100"}`}
                >
                    미리보기
                </button>
            </div>

            {/* 에디터/프리뷰 */}
            {mode === "edit" ? (
                <textarea
                    ref={taRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder || "내용을 입력해 주세요. (마크다운 지원: # 제목, -, *, **굵게** 등)"}
                    className="
            w-full resize-none leading-7
            bg-transparent outline-none
            placeholder:text-[#9CA3AF]
            text-[15px]
          "
                    style={{ minHeight: 220 }}
                />
            ) : (
                <div
                    className="min-h-[220px] leading-7 text-[15px]"
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            )}
        </div>
    );
}