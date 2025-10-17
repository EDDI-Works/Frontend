import { isSameDate, isBetweenDay, ymd } from "../../utils/date";

type UiMeeting = {
    id: string | number;
    title?: string;
    allDay?: boolean;
    start: string;
    end: string;
    team?: string;
    teams?: string[];
};

type Props = {
    cursor: Date;
    weeks: Date[][];
    meetings: UiMeeting[];
    onSelectDate: (d: Date) => void;
    selectedDate?: Date;
};

export default function MonthGrid({
                                      cursor, weeks, meetings, onSelectDate, selectedDate,
                                  }: Props) {

    return (
        <div className="h-full overflow-hidden pt-2 pb-4">
            <div className="grid grid-cols-7 h-10 border-y border-[#E6ECF5] text-center">
                {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d, i) => (
                    <div key={d} className="flex items-center justify-center text-[12px] font-medium tracking-wide">
                        <span className={i === 0 ? "text-[#FF6B6B]" : i === 6 ? "text-[#3A72F8]" : "text-[#8A93A3]"}>{d}</span>
                    </div>
                ))}
            </div>

            {/* 본문 + 하단 보더 유지 */}
            <div className="grid h-[calc(100%-40px)] grid-rows-[repeat(6,minmax(0,1fr))] divide-y divide-[#E6ECF5] border-b border-[#E6ECF5]">
                {weeks.map((row, ri) => (
                    <div key={ri} className="grid grid-cols-7 divide-x divide-[#E6ECF5]">
                        {row.map((d, di) => {
                            const out = d.getMonth() !== cursor.getMonth();
                            const isSel = selectedDate ? isSameDate(d, selectedDate) : false;
                            const isToday = isSameDate(d, new Date());
                            const isSun = d.getDay() === 0;
                            const isSat = d.getDay() === 6;

                            const items = meetings.filter(
                                (m) =>
                                    isSameDate(d, new Date(m.start)) ||
                                    (m.allDay && isBetweenDay(d, new Date(m.start), new Date(m.end)))
                            );

                            return (
                                <div
                                    key={di}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => onSelectDate(d)}
                                    onKeyDown={(e) => e.key === "Enter" && onSelectDate(d)}
                                    className={[
                                        "relative h-full cursor-pointer overflow-hidden",
                                        out ? "bg-[#F7F9FC]" : "bg-white",
                                    ].join(" ")}
                                >
                                    {/* 선택선: 라운드 제거, 그리드 라인과 정렬 */}
                                    {isSel && (
                                        <span
                                            aria-hidden
                                            className="pointer-events-none absolute inset-0 z-10 outline outline-[2px] outline-[#F2A66C] outline-offset-[-1px]"
                                        />
                                    )}

                                    <div className="px-2 pt-2">
                    <span
                        title={ymd(d)}
                        className={[
                            "inline-flex h-6.5 w-6.5 items-center justify-center text-[12px] leading-none",
                            isToday ? "rounded-full bg-[#F2A66C] text-white" : "",
                            out ? "text-[#D0D5DD]" : "text-[#2B2F37]",
                            isSun ? "text-[#FF6B6B]" : "",
                            isSat ? "text-[#3A72F8]" : "",
                        ].join(" ")}
                    >
                      {d.getDate()}
                    </span>
                                    </div>

                                    <div className="space-y-1 px-3 pb-4">
                                        {items.map((m) => (
                                            <div
                                                key={m.id}
                                                className="flex items-center gap-2 truncate text-[12px] text-[#4B5563]"
                                                title={m.title}
                                            >
                        <span
                            className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: m.allDay ? "#F6A77A" : "#8AB6FF" }}
                        />
                                                <span className="truncate">{m.title ?? "Untitled"}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
