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
    meetings: UiMeeting[];
    onSelectDate: (d: Date) => void;
    selectedDate?: Date;
};

function startOfWeek(d: Date) {
    const x = new Date(d);
    const diff = x.getDay();
    x.setDate(x.getDate() - diff);
    x.setHours(0, 0, 0, 0);
    return x;
}
function addDays(d: Date, n: number) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
}

export default function WeekGrid({ cursor, meetings, onSelectDate, selectedDate }: Props) {
    const head = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const start = startOfWeek(cursor);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

    return (
        <div className="h-full overflow-hidden pt-2">
            <div className="grid grid-cols-7 h-10 border-y border-[#E6ECF5] text-center">
                {head.map((d, i) => (
                    <div key={d} className="flex items-center justify-center text-[12px] font-medium tracking-wide">
                        <span className={i === 0 ? "text-[#FF6B6B]" : i === 6 ? "text-[#3A72F8]" : "text-[#8A93A3]"}>{d}</span>
                    </div>
                ))}
            </div>

            {/* 본문 + 하단 보더 유지 */}
            <div className="grid h-[calc(100%-40px)] grid-rows-1 divide-y divide-[#E6ECF5] border-b border-[#E6ECF5]">
                <div className="grid grid-cols-7 divide-x divide-[#E6ECF5]">
                    {days.map((d, i) => {
                        const isToday = isSameDate(d, new Date());
                        const isSel = selectedDate ? isSameDate(d, selectedDate) : false;
                        const isSun = i === 0;
                        const isSat = i === 6;

                        const items = meetings.filter(
                            (m) =>
                                isSameDate(d, new Date(m.start)) ||
                                (m.allDay && isBetweenDay(d, new Date(m.start), new Date(m.end)))
                        );

                        return (
                            <div
                                key={i}
                                role="button"
                                tabIndex={0}
                                onClick={() => onSelectDate(d)}
                                onKeyDown={(e) => e.key === "Enter" && onSelectDate(d)}
                                className="relative h-full cursor-pointer bg-white overflow-hidden"
                            >
                                {/* 선택선: 라운드 제거, 그리드 라인과 정렬 */}
                                {isSel && (
                                    <span
                                        aria-hidden
                                        className="pointer-events-none absolute inset-0 z-10 outline outline-[2px] outline-[#F2A66C] outline-offset-[-1px]"
                                    />
                                )}

                                <div className="px-3 pt-2">
                  <span
                      title={ymd(d)}
                      className={[
                          "inline-flex h-6.5 w-6.5 items-center justify-center text-[12px] leading-none",
                          isToday ? "rounded-full bg-[#F2A66C] text-white" : "",
                          "text-[#2B2F37]",
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
                                            <span className="truncate">{m.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
