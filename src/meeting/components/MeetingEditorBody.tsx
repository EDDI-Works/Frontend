// import React from "react";
// import Content from "./notes/Content.tsx";
// import Details from "./notes/Details.tsx";
//
// // 외부 노출 타입
// export type MeetingCore = {
// 	id?: string;             // 서버 publicId (UUID)
// 	title: string;
// 	start: Date;
// 	end: Date;
// 	allDay: boolean;
// 	team?: string;
// };
//
// export type MeetingMeta = {
// 	location?: string;
// 	participants?: string;
// 	links: string[];
// 	notes: string;
// };
//
// type Props = {
// 	mode: "new" | "detail";
// 	initial: { meeting: MeetingCore; meta: MeetingMeta };
// 	onSave: (data: { meeting: MeetingCore; meta: MeetingMeta }) => Promise<void> | void;
// 	onCancel?: () => void;
// 	teamOptions?: readonly string[];
// 	canPersistBoards?: boolean; // [NEW] 서버 상세 200인 경우에만 보드 API 허용
// };
//
// // dev 안전장치: publicId 문자열 보장 체크
// function assertPublicId(id: unknown) {
// 	if (id != null && typeof id !== "string") {
// 		// eslint-disable-next-line no-console
// 		console.warn(
// 			"[MeetingEditorBody] meeting.id는 publicId 문자열이어야 합니다. 현재 타입:",
// 			typeof id,
// 			id
// 		);
// 	}
// }
//
// export default function MeetingEditorBody({
// 											  mode,
// 											  initial,
// 											  onSave,
// 											  onCancel,
// 											  teamOptions = [],
// 											  canPersistBoards = false,   // [NEW]
// 										  }: Props) {
// 	// ===== 좌측(콘텐츠) 상태 =====
// 	const [title, setTitle] = React.useState(initial.meeting.title || "");
// 	const [notes, setNotes] = React.useState(initial.meta.notes || "");
// 	const [links, setLinks] = React.useState<string[]>(initial.meta.links ?? []);
// 	const [linkOpen, setLinkOpen] = React.useState<boolean>(true);
//
// 	// ===== 우측(세부 정보) 상태 =====
// 	const [allDay, setAllDay] = React.useState(!!initial.meeting.allDay);
// 	const [start, setStart] = React.useState<Date>(new Date(initial.meeting.start));
// 	const [end, setEnd] = React.useState<Date>(new Date(initial.meeting.end));
// 	const [team, setTeam] = React.useState<string>(initial.meeting.team || "");
// 	const [location, setLocation] = React.useState(initial.meta.location || "");
// 	const [participants, setParticipants] = React.useState(initial.meta.participants || ""); // ", " 문자열
//
// 	// publicId 문자열 보장 체크(개발 편의)
// 	React.useEffect(() => {
// 		assertPublicId(initial.meeting.id);
// 	}, [initial.meeting.id]);
//
// 	// === 수동 저장 (버튼용) ===
// 	const handleSave = React.useCallback(() => {
// 		const metaToSave: MeetingMeta = {
// 			notes,
// 			location,
// 			participants,
// 			links,
// 		};
//
// 		onSave({
// 			meeting: {
// 				id: initial.meeting.id,
// 				title: title || "제목 없음",
// 				start,
// 				end,
// 				allDay,
// 				team,
// 			},
// 			meta: metaToSave,
// 		});
// 	}, [title, notes, links, location, participants, start, end, allDay, team, onSave, initial.meeting.id]);
//
// 	// ✅ 자동저장 완전 제거됨 (디바운스 useEffect 삭제)
//
// 	return (
// 		<div className="flex-1 min-h-0 px-6 pb-8">
// 			{/* 상단 우측 버튼 */}
// 			<div className="pt-5 pb-3 flex items-center justify-end">
// 				{onCancel && (
// 					<button className="h-8 px-3 rounded-md border mr-2" onClick={onCancel}>
// 						{mode === "new" ? "뒤로" : "뒤로"}
// 					</button>
// 				)}
// 				<button
// 					className="h-8 px-4 rounded-md bg-[#6D6CF8] text-white"
// 					onClick={handleSave}
// 					disabled={!title.trim()}
// 					title={!title.trim() ? "제목을 입력해 주세요." : "저장"}
// 				>
// 					저장
// 				</button>
// 			</div>
//
// 			{/* === 2열 레이아웃 === */}
// 			<div
// 				className="
//           grid gap-6 items-start
//           grid-cols-1
//           lg:grid-cols-[minmax(0,1fr)_340px]
//         "
// 			>
// 				{/* 왼쪽: 콘텐츠 */}
// 				<div className="min-w-0">
// 					<Content
// 						publicId={String(initial.meeting.id ?? "")}
// 						title={title} setTitle={setTitle}
// 						notes={notes} setNotes={setNotes}
// 						links={links} setLinks={setLinks}
// 						linkOpen={linkOpen} setLinkOpen={setLinkOpen}
// 						participants={participants}
// 						canPersistBoards={canPersistBoards}
// 					/>
// 				</div>
//
// 				{/* 오른쪽: 세부 정보 */}
// 				<div className="lg:sticky lg:top-16">
// 					<Details
// 						meetingId={initial.meeting.id ?? "new"}
// 						ownerId={""}
// 						allDay={allDay} setAllDay={setAllDay}
// 						start={start} setStart={setStart}
// 						end={end} setEnd={setEnd}
// 						team={team} setTeam={setTeam}
// 						teamOptions={teamOptions}
// 						location={location} setLocation={setLocation}
// 						participants={participants} setParticipants={setParticipants}
// 					/>
// 				</div>
// 			</div>
// 		</div>
// 	);
// }

import React from "react";
import Content from "./notes/Content.tsx";
import Details from "./notes/Details.tsx";

// 외부 노출 타입
export type MeetingCore = {
	id?: string;             // 서버 publicId (UUID)
	title: string;
	start: Date;
	end: Date;
	allDay: boolean;
	team?: string;
};

export type MeetingMeta = {
	location?: string;
	participants?: string;
	links: string[];
	notes: string;
};

type Props = {
	mode: "new" | "detail";
	initial: { meeting: MeetingCore; meta: MeetingMeta };
	onSave: (data: { meeting: MeetingCore; meta: MeetingMeta }) => Promise<void> | void;
	onCancel?: () => void;
	teamOptions?: readonly string[];
	canPersistBoards?: boolean; // 서버 상세 200인 경우에만 보드 API 허용
	resetKey?: number;          // 🔁 부모가 올려주는 리셋 트리거
};

// dev 안전장치: publicId 문자열 보장 체크
function assertPublicId(id: unknown) {
	if (id != null && typeof id !== "string") {
		// eslint-disable-next-line no-console
		console.warn(
			"[MeetingEditorBody] meeting.id는 publicId 문자열이어야 합니다. 현재 타입:",
			typeof id,
			id
		);
	}
}

export default function MeetingEditorBody({
											  mode,
											  initial,
											  onSave,
											  onCancel,
											  teamOptions = [],
											  canPersistBoards = false,
											  resetKey = 0,
										  }: Props) {
	// ===== 좌측(콘텐츠) 상태 =====
	const [title, setTitle] = React.useState(initial.meeting.title || "");
	const [notes, setNotes] = React.useState(initial.meta.notes || "");
	const [links, setLinks] = React.useState<string[]>(initial.meta.links ?? []);
	const [linkOpen, setLinkOpen] = React.useState<boolean>(true);

	// ===== 우측(세부 정보) 상태 =====
	const [allDay, setAllDay] = React.useState(!!initial.meeting.allDay);
	const [start, setStart] = React.useState<Date>(new Date(initial.meeting.start));
	const [end, setEnd] = React.useState<Date>(new Date(initial.meeting.end));
	const [team, setTeam] = React.useState<string>(initial.meeting.team || "");
	const [location, setLocation] = React.useState(initial.meta.location || "");
	const [participants, setParticipants] = React.useState(initial.meta.participants || ""); // ", " 문자열

	// publicId 문자열 보장 체크(개발 편의)
	React.useEffect(() => {
		assertPublicId(initial.meeting.id);
	}, [initial.meeting.id]);

	// 🔁 부모가 최신 상세를 주면 내부 상태를 초기값으로 되돌림
	React.useEffect(() => {
		setTitle(initial.meeting.title || "");
		setNotes(initial.meta.notes || "");
		setLinks(initial.meta.links ?? []);
		setAllDay(!!initial.meeting.allDay);
		setStart(new Date(initial.meeting.start));
		setEnd(new Date(initial.meeting.end));
		setTeam(initial.meeting.team || "");
		setLocation(initial.meta.location || "");
		setParticipants(initial.meta.participants || "");
	}, [resetKey, initial]);

	// === 수동 저장 (버튼용) ===
	const handleSave = React.useCallback(() => {
		const metaToSave: MeetingMeta = {
			notes,
			location,
			participants,
			links,
		};

		onSave({
			meeting: {
				id: initial.meeting.id,
				title: title || "제목 없음",
				start,
				end,
				allDay,
				team,
			},
			meta: metaToSave,
		});
	}, [title, notes, links, location, participants, start, end, allDay, team, onSave, initial.meeting.id]);

	// ✅ 자동저장 완전 제거됨

	return (
		<div className="flex-1 min-h-0 px-6 pb-8">
			{/* 상단 우측 버튼 */}
			<div className="pt-5 pb-3 flex items-center justify-end">
				{onCancel && (
					<button className="h-8 px-3 rounded-md border mr-2" onClick={onCancel}>
						{mode === "new" ? "뒤로" : "뒤로"}
					</button>
				)}
				<button
					className="h-8 px-4 rounded-md bg-[#6D6CF8] text-white"
					onClick={handleSave}
					disabled={!title.trim()}
					title={!title.trim() ? "제목을 입력해 주세요." : "저장"}
				>
					저장
				</button>
			</div>

			{/* === 2열 레이아웃 === */}
			<div
				className="
          grid gap-6 items-start
          grid-cols-1
          lg:grid-cols-[minmax(0,1fr)_340px]
        "
			>
				{/* 왼쪽: 콘텐츠 */}
				<div className="min-w-0">
					<Content
						publicId={String(initial.meeting.id ?? "")}
						title={title} setTitle={setTitle}
						notes={notes} setNotes={setNotes}
						links={links} setLinks={setLinks}
						linkOpen={linkOpen} setLinkOpen={setLinkOpen}
						participants={participants}
						canPersistBoards={canPersistBoards}
					/>
				</div>

				{/* 오른쪽: 세부 정보 */}
				<div className="lg:sticky lg:top-16">
					<Details
						meetingId={initial.meeting.id ?? "new"}
						ownerId={""}
						allDay={allDay} setAllDay={setAllDay}
						start={start} setStart={setStart}
						end={end} setEnd={setEnd}
						team={team} setTeam={setTeam}
						teamOptions={teamOptions}
						location={location} setLocation={setLocation}
						participants={participants} setParticipants={setParticipants}
					/>
				</div>
			</div>
		</div>
	);
}
