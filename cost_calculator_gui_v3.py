"""
=============================================================================
모듈명: cost_calculator_gui.py
역할: 총액·인분·더치페이 계산기 GUI (모던 디자인)
의존성: Python 3.8+ (tkinter 표준 라이브러리)
=============================================================================
"""

import tkinter as tk
from tkinter import messagebox, filedialog
import math
import re
import json
import os


class CostCalculatorApp:
    """더치페이 계산기 - 모던 UI"""

    # 색상 팔레트
    BG = "#f4f6fb"
    CARD = "#ffffff"
    PRIMARY = "#5046e5"
    PRIMARY_LIGHT = "#ededfc"
    PRIMARY_DARK = "#3730a3"
    ACCENT = "#ec4899"
    TEXT = "#1e293b"
    TEXT_SEC = "#64748b"
    TEXT_MUTED = "#94a3b8"
    SUCCESS = "#10b981"
    DANGER = "#ef4444"
    BORDER = "#e2e8f0"
    SHADOW = "#c7d2fe"

    # 결과 영역
    RES_BG = "#1e1b4b"
    RES_FG = "#f1f5f9"
    RES_ACCENT = "#a78bfa"
    RES_GOLD = "#fbbf24"
    RES_DIVIDER = "#312e81"

    FONT = "맑은 고딕"

    def __init__(self):
        self.root = tk.Tk()
        self.root.title("더치페이 계산기")
        self.root.geometry("560x900")
        self.root.configure(bg=self.BG)
        self.root.resizable(True, True)

        self.menu_data = []
        self.check_vars = []
        self.last_result_text = ""

        self._build_ui()

    # =========================================================================
    # 유틸리티
    # =========================================================================

    @staticmethod
    def _parse_price(s: str) -> int:
        """콤마 포함 문자열에서 숫자 추출 (8번: 콤마 허용)"""
        cleaned = re.sub(r'[^\d]', '', s)
        return int(cleaned) if cleaned else 0

    @staticmethod
    def _format_comma(n: int) -> str:
        """숫자를 콤마 포맷으로"""
        return f"{n:,}"

    # =========================================================================
    # UI 빌드
    # =========================================================================

    def _build_ui(self):
        # 헤더
        header = tk.Frame(self.root, bg=self.PRIMARY, height=64)
        header.pack(fill="x")
        header.pack_propagate(False)

        header_inner = tk.Frame(header, bg=self.PRIMARY)
        header_inner.pack(expand=True)

        tk.Label(header_inner, text="÷", font=(self.FONT, 22, "bold"),
                 bg=self.PRIMARY, fg="#c4b5fd").pack(side="left", padx=(0, 8))
        tk.Label(header_inner, text="더치페이 계산기", font=(self.FONT, 16, "bold"),
                 bg=self.PRIMARY, fg="white").pack(side="left")

        # 스크롤 영역
        self.canvas = tk.Canvas(self.root, bg=self.BG, highlightthickness=0)
        vsb = tk.Scrollbar(self.root, orient="vertical", command=self.canvas.yview)
        self.canvas.configure(yscrollcommand=vsb.set)

        vsb.pack(side="right", fill="y")
        self.canvas.pack(side="left", fill="both", expand=True)

        self.main_frame = tk.Frame(self.canvas, bg=self.BG)
        self.canvas_window = self.canvas.create_window((0, 0), window=self.main_frame,
                                                        anchor="nw", tags="main")

        self.main_frame.bind("<Configure>",
                             lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all")))
        self.canvas.bind("<Configure>", self._on_canvas_resize)
        self.canvas.bind_all("<MouseWheel>",
                             lambda e: self.canvas.yview_scroll(int(-1 * (e.delta / 120)), "units"))

        parent = self.main_frame

        content = tk.Frame(parent, bg=self.BG)
        content.pack(fill="both", expand=True, padx=24, pady=20)

        # --- 카드: 메뉴 입력 ---
        card1 = self._create_card(content)
        self._card_title(card1, "메뉴 추가", "주문한 메뉴를 하나씩 입력하세요")

        # 9번: JSON 불러오기 버튼
        json_load_frame = tk.Frame(card1, bg=self.CARD)
        json_load_frame.pack(fill="x", padx=20, pady=(6, 0))

        tk.Button(json_load_frame, text="JSON 불러오기", font=(self.FONT, 9),
                  bg=self.SUCCESS, fg="white", bd=0, cursor="hand2",
                  activebackground="#059669", activeforeground="white",
                  padx=10, pady=3, command=self._load_json).pack(side="left")

        tk.Label(json_load_frame, text="추천 알고리즘 결과 파일을 불러옵니다",
                 font=(self.FONT, 8), bg=self.CARD, fg=self.TEXT_MUTED).pack(side="left", padx=(8, 0))

        # 입력 필드
        input_area = tk.Frame(card1, bg=self.CARD)
        input_area.pack(fill="x", padx=20, pady=(10, 0))

        col1 = tk.Frame(input_area, bg=self.CARD)
        col1.pack(side="left", padx=(0, 6), fill="x", expand=True)
        tk.Label(col1, text="메뉴명", font=(self.FONT, 8), bg=self.CARD,
                 fg=self.TEXT_MUTED).pack(anchor="w")
        self.entry_name = tk.Entry(col1, font=(self.FONT, 11), bg=self.BG,
                                   relief="flat", highlightthickness=2,
                                   highlightcolor=self.PRIMARY,
                                   highlightbackground=self.BORDER)
        self.entry_name.pack(fill="x", ipady=5)

        col2 = tk.Frame(input_area, bg=self.CARD)
        col2.pack(side="left", padx=(0, 6))
        tk.Label(col2, text="단가(원)", font=(self.FONT, 8), bg=self.CARD,
                 fg=self.TEXT_MUTED).pack(anchor="w")
        self.entry_price = tk.Entry(col2, font=(self.FONT, 11), width=10, bg=self.BG,
                                    relief="flat", highlightthickness=2,
                                    highlightcolor=self.PRIMARY,
                                    highlightbackground=self.BORDER)
        self.entry_price.pack(ipady=5)

        col3 = tk.Frame(input_area, bg=self.CARD)
        col3.pack(side="left", padx=(0, 6))
        tk.Label(col3, text="수량", font=(self.FONT, 8), bg=self.CARD,
                 fg=self.TEXT_MUTED).pack(anchor="w")
        self.entry_qty = tk.Entry(col3, font=(self.FONT, 11), width=4, bg=self.BG,
                                  relief="flat", highlightthickness=2,
                                  highlightcolor=self.PRIMARY,
                                  highlightbackground=self.BORDER)
        self.entry_qty.pack(ipady=5)

        col4 = tk.Frame(input_area, bg=self.CARD)
        col4.pack(side="left")
        tk.Label(col4, text=" ", font=(self.FONT, 8), bg=self.CARD).pack()
        self.btn_add = tk.Button(col4, text="추가", font=(self.FONT, 10, "bold"),
                                 bg=self.PRIMARY, fg="white", bd=0, cursor="hand2",
                                 activebackground=self.PRIMARY_DARK, activeforeground="white",
                                 padx=14, pady=6, command=self._add_menu)
        self.btn_add.pack(ipady=1)

        # 3번: Tab 이동 (메뉴명 → 단가 → 수량 → 추가버튼)
        self.entry_name.bind("<Tab>", lambda e: self._focus_next(self.entry_price))
        self.entry_price.bind("<Tab>", lambda e: self._focus_next(self.entry_qty))
        self.entry_qty.bind("<Tab>", lambda e: self._focus_next(self.btn_add))

        # Enter로 추가
        self.entry_name.bind("<Return>", lambda e: self._focus_next(self.entry_price))
        self.entry_price.bind("<Return>", lambda e: self._focus_next(self.entry_qty))
        self.entry_qty.bind("<Return>", lambda e: self._add_menu())

        # 4번: 단가 입력 시 자동 콤마 표시
        self.entry_price.bind("<KeyRelease>", self._on_price_key)
        self.entry_price.bind("<FocusOut>", self._on_price_focusout)

        # --- 메뉴 리스트 (스크롤 제한 높이) ---
        list_container = tk.Frame(card1, bg=self.CARD)
        list_container.pack(fill="x", padx=20, pady=(12, 0))

        self.list_canvas = tk.Canvas(list_container, bg=self.CARD, highlightthickness=0,
                                     height=180)
        self.list_scrollbar = tk.Scrollbar(list_container, orient="vertical",
                                           command=self.list_canvas.yview)
        self.list_canvas.configure(yscrollcommand=self.list_scrollbar.set)

        self.list_frame = tk.Frame(self.list_canvas, bg=self.CARD)
        self.list_canvas.create_window((0, 0), window=self.list_frame, anchor="nw", tags="list")

        self.list_frame.bind("<Configure>", self._on_list_configure)
        self.list_canvas.bind("<Configure>",
                              lambda e: self.list_canvas.itemconfig("list", width=e.width))

        self.list_canvas.pack(side="left", fill="x", expand=True)
        self.list_scrollbar.pack(side="right", fill="y")
        self.list_scrollbar.pack_forget()

        self.list_canvas.bind("<Enter>",
                              lambda e: self.list_canvas.bind_all("<MouseWheel>", self._on_list_scroll))
        self.list_canvas.bind("<Leave>",
                              lambda e: self.canvas.bind_all("<MouseWheel>",
                                                             lambda ev: self.canvas.yview_scroll(
                                                                 int(-1 * (ev.delta / 120)), "units")))

        self._draw_empty_list()

        # 전체 선택 + 삭제 + 총액
        action_row = tk.Frame(card1, bg=self.CARD)
        action_row.pack(fill="x", padx=20, pady=(8, 16))

        self.select_all_var = tk.BooleanVar(value=False)
        tk.Checkbutton(action_row, text="전체선택", variable=self.select_all_var,
                       font=(self.FONT, 9), bg=self.CARD, fg=self.TEXT_SEC,
                       activebackground=self.CARD, selectcolor=self.PRIMARY_LIGHT,
                       command=self._toggle_select_all).pack(side="left")

        tk.Button(action_row, text="선택 삭제", font=(self.FONT, 9),
                  bg=self.DANGER, fg="white", bd=0, cursor="hand2",
                  activebackground="#dc2626", activeforeground="white",
                  padx=10, pady=4, command=self._delete_selected).pack(side="left", padx=(8, 0))

        self.label_total = tk.Label(action_row, text="총액  0원",
                                    font=(self.FONT, 14, "bold"),
                                    bg=self.CARD, fg=self.PRIMARY)
        self.label_total.pack(side="right")

        # --- 카드: 설정 ---
        card2 = self._create_card(content)
        self._card_title(card2, "설정", "인원수와 끝전 처리를 선택하세요")

        setting_inner = tk.Frame(card2, bg=self.CARD)
        setting_inner.pack(fill="x", padx=20, pady=(10, 16))

        # 인원수
        row1 = tk.Frame(setting_inner, bg=self.CARD)
        row1.pack(fill="x", pady=(0, 10))

        tk.Label(row1, text="인원수", font=(self.FONT, 10, "bold"),
                 bg=self.CARD, fg=self.TEXT).pack(side="left")

        people_box = tk.Frame(row1, bg=self.BORDER)
        people_box.pack(side="right")
        people_inner = tk.Frame(people_box, bg=self.BG)
        people_inner.pack(padx=1, pady=1)

        self.spin_people = tk.Spinbox(people_inner, from_=1, to=99, width=3,
                                      font=(self.FONT, 14, "bold"), justify="center",
                                      bg=self.BG, fg=self.PRIMARY, relief="flat",
                                      buttonbackground=self.BG)
        self.spin_people.delete(0, "end")
        self.spin_people.insert(0, "2")
        self.spin_people.pack(side="left", padx=4, pady=2)
        tk.Label(people_inner, text="명 ", font=(self.FONT, 10),
                 bg=self.BG, fg=self.TEXT).pack(side="left")

        # 끝전
        row2 = tk.Frame(setting_inner, bg=self.CARD)
        row2.pack(fill="x", pady=(0, 10))

        tk.Label(row2, text="끝전 처리", font=(self.FONT, 10, "bold"),
                 bg=self.CARD, fg=self.TEXT).pack(side="left")

        round_box = tk.Frame(row2, bg=self.CARD)
        round_box.pack(side="right")
        self.rounding_var = tk.StringVar(value="100")
        for label, val in [("100원", "100"), ("1000원", "1000"), ("없음", "1")]:
            tk.Radiobutton(round_box, text=label, variable=self.rounding_var, value=val,
                           font=(self.FONT, 9), bg=self.CARD, fg=self.TEXT,
                           activebackground=self.CARD, selectcolor=self.PRIMARY_LIGHT
                           ).pack(side="left", padx=4)

        # 7번: 송금 계좌 입력
        row3 = tk.Frame(setting_inner, bg=self.CARD)
        row3.pack(fill="x")

        tk.Label(row3, text="송금 계좌", font=(self.FONT, 10, "bold"),
                 bg=self.CARD, fg=self.TEXT).pack(side="left")

        self.entry_account = tk.Entry(row3, font=(self.FONT, 10), width=22, bg=self.BG,
                                      relief="flat", highlightthickness=2,
                                      highlightcolor=self.PRIMARY,
                                      highlightbackground=self.BORDER)
        self.entry_account.pack(side="right", ipady=4)
        self.entry_account.insert(0, "")

        # 계좌 안내
        account_hint = tk.Label(setting_inner, text="예: 카카오뱅크 3333-01-1234567 홍길동",
                                font=(self.FONT, 8), bg=self.CARD, fg=self.TEXT_MUTED)
        account_hint.pack(anchor="e", pady=(4, 0))

        # --- 계산 버튼 ---
        tk.Button(content, text="계산하기", font=(self.FONT, 14, "bold"),
                  bg=self.ACCENT, fg="white", bd=0, cursor="hand2",
                  activebackground="#db2777", activeforeground="white",
                  padx=40, pady=12, command=self._calculate).pack(pady=(8, 16), fill="x")

        # --- 결과 카드 ---
        self.result_outer = tk.Frame(content, bg=self.RES_BG, highlightthickness=0)
        self.result_outer.pack(fill="both", expand=True)

        self.result_inner = tk.Frame(self.result_outer, bg=self.RES_BG)
        self.result_inner.pack(fill="both", expand=True, padx=24, pady=20)

        tk.Label(self.result_inner, text="결과가 여기에 표시됩니다",
                 font=(self.FONT, 10), bg=self.RES_BG, fg="#4c4878").pack(pady=20)

    # =========================================================================
    # 카드 & 헬퍼
    # =========================================================================

    def _create_card(self, parent):
        shadow = tk.Frame(parent, bg=self.SHADOW)
        shadow.pack(fill="x", pady=(0, 14))
        card = tk.Frame(shadow, bg=self.CARD)
        card.pack(fill="x", padx=0, pady=(0, 2))
        return card

    def _card_title(self, card, title, subtitle=""):
        frame = tk.Frame(card, bg=self.CARD)
        frame.pack(fill="x", padx=20, pady=(16, 0))
        tk.Label(frame, text=title, font=(self.FONT, 12, "bold"),
                 bg=self.CARD, fg=self.TEXT).pack(anchor="w")
        if subtitle:
            tk.Label(frame, text=subtitle, font=(self.FONT, 9),
                     bg=self.CARD, fg=self.TEXT_MUTED).pack(anchor="w", pady=(2, 0))
        tk.Frame(card, bg=self.BORDER, height=1).pack(fill="x", padx=20, pady=(10, 0))

    def _draw_empty_list(self):
        for w in self.list_frame.winfo_children():
            w.destroy()
        tk.Label(self.list_frame, text="아직 추가된 메뉴가 없습니다",
                 font=(self.FONT, 9), bg=self.CARD, fg=self.TEXT_MUTED).pack(pady=14)
        self.list_scrollbar.pack_forget()

    def _on_canvas_resize(self, event):
        self.canvas.itemconfig("main", width=event.width)

    def _on_list_configure(self, event):
        self.list_canvas.configure(scrollregion=self.list_canvas.bbox("all"))
        if event.height > 180:
            self.list_scrollbar.pack(side="right", fill="y")
        else:
            self.list_scrollbar.pack_forget()

    def _on_list_scroll(self, event):
        self.list_canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

    def _focus_next(self, widget):
        """다음 위젯으로 포커스 이동 (3번: Tab 이동)"""
        widget.focus_set()
        return "break"  # 기본 Tab 동작 방지

    # =========================================================================
    # 4번: 단가 자동 콤마 표시
    # =========================================================================

    def _on_price_key(self, event):
        """키 입력 시 콤마 자동 포맷"""
        # 허용 키: 숫자, 백스페이스, 방향키 등은 무시
        if event.keysym in ("BackSpace", "Delete", "Left", "Right", "Tab"):
            return

        raw = self.entry_price.get()
        num = self._parse_price(raw)

        if num > 0:
            # 커서 위치 보존
            cursor_pos = self.entry_price.index(tk.INSERT)
            formatted = self._format_comma(num)

            self.entry_price.delete(0, tk.END)
            self.entry_price.insert(0, formatted)

            # 커서 위치 조정 (콤마 추가분 보정)
            new_pos = min(cursor_pos + (len(formatted) - len(raw)), len(formatted))
            self.entry_price.icursor(new_pos)

    def _on_price_focusout(self, event):
        """포커스 아웃 시 최종 포맷 정리"""
        raw = self.entry_price.get()
        num = self._parse_price(raw)
        if num > 0:
            self.entry_price.delete(0, tk.END)
            self.entry_price.insert(0, self._format_comma(num))

    # =========================================================================
    # 메뉴 리스트
    # =========================================================================

    def _refresh_list(self):
        for w in self.list_frame.winfo_children():
            w.destroy()

        self.check_vars = []
        self.select_all_var.set(False)

        if not self.menu_data:
            self._draw_empty_list()
            self.label_total.config(text="총액  0원")
            return

        if len(self.menu_data) > 5:
            self.list_scrollbar.pack(side="right", fill="y")
        else:
            self.list_scrollbar.pack_forget()

        total = 0
        for i, item in enumerate(self.menu_data):
            subtotal = item["price"] * item["qty"]
            total += subtotal

            bg = self.CARD if i % 2 == 0 else "#f8fafc"

            row = tk.Frame(self.list_frame, bg=bg)
            row.pack(fill="x")

            # 체크박스
            var = tk.BooleanVar(value=False)
            self.check_vars.append(var)
            tk.Checkbutton(row, variable=var, bg=bg, activebackground=bg,
                           highlightthickness=0, bd=0,
                           selectcolor=self.PRIMARY_LIGHT).pack(side="left", padx=(8, 4), pady=5)

            # 메뉴명
            tk.Label(row, text=item["name"], font=(self.FONT, 10),
                     bg=bg, fg=self.TEXT, anchor="w").pack(side="left", padx=(0, 4))

            # 소계 (오른쪽 끝)
            tk.Label(row, text=f"{subtotal:,}원", font=(self.FONT, 10, "bold"),
                     bg=bg, fg=self.PRIMARY, anchor="e").pack(side="right", padx=(0, 10), pady=5)

            # +/- 수량 조절
            ctrl = tk.Frame(row, bg=bg)
            ctrl.pack(side="right", padx=(0, 8))

            tk.Button(ctrl, text="−", font=(self.FONT, 9, "bold"),
                      bg=self.BORDER, fg=self.TEXT, bd=0, width=2, cursor="hand2",
                      command=lambda idx=i: self._change_qty(idx, -1)).pack(side="left")

            tk.Label(ctrl, text=f" {item['qty']} ", font=(self.FONT, 10, "bold"),
                     bg=bg, fg=self.TEXT, width=3).pack(side="left")

            tk.Button(ctrl, text="+", font=(self.FONT, 9, "bold"),
                      bg=self.PRIMARY_LIGHT, fg=self.PRIMARY, bd=0, width=2, cursor="hand2",
                      command=lambda idx=i: self._change_qty(idx, 1)).pack(side="left")

            # 단가
            tk.Label(row, text=f"@{item['price']:,}", font=(self.FONT, 8),
                     bg=bg, fg=self.TEXT_MUTED, anchor="e").pack(side="right", padx=(0, 4))

        self.label_total.config(text=f"총액  {total:,}원")

    # =========================================================================
    # 이벤트
    # =========================================================================

    def _add_menu(self):
        name = self.entry_name.get().strip()
        price_str = self.entry_price.get().strip()
        qty_str = self.entry_qty.get().strip()

        if not name:
            messagebox.showwarning("입력 오류", "메뉴명을 입력하세요.")
            self.entry_name.focus()
            return

        if not price_str:
            messagebox.showwarning("입력 오류", "단가를 입력하세요.")
            self.entry_price.focus()
            return

        # 8번: 콤마 포함 문자열 허용
        price = self._parse_price(price_str)
        if price <= 0:
            messagebox.showwarning("입력 오류", "단가는 1 이상의 숫자를 입력하세요.")
            self.entry_price.focus()
            return

        # 9번: 수량 비어있으면 기본값 1
        if not qty_str:
            qty = 1
        else:
            try:
                qty = int(qty_str)
                if qty <= 0:
                    raise ValueError
            except ValueError:
                messagebox.showwarning("입력 오류", "수량은 1 이상 정수로 입력하세요.")
                self.entry_qty.focus()
                return

        self.menu_data.append({"name": name, "price": price, "qty": qty})
        self._refresh_list()

        self.entry_name.delete(0, tk.END)
        self.entry_price.delete(0, tk.END)
        self.entry_qty.delete(0, tk.END)
        self.entry_name.focus()

    def _change_qty(self, index, delta):
        new_qty = self.menu_data[index]["qty"] + delta
        if new_qty <= 0:
            self.menu_data.pop(index)
        else:
            self.menu_data[index]["qty"] = new_qty
        self._refresh_list()

    def _toggle_select_all(self):
        val = self.select_all_var.get()
        for var in self.check_vars:
            var.set(val)

    def _delete_selected(self):
        indices = [i for i, var in enumerate(self.check_vars) if var.get()]
        if not indices:
            messagebox.showinfo("안내", "삭제할 항목을 체크하세요.")
            return
        for i in sorted(indices, reverse=True):
            self.menu_data.pop(i)
        self._refresh_list()

    def _calculate(self):
        if not self.menu_data:
            messagebox.showwarning("계산 불가", "메뉴를 1개 이상 추가하세요.")
            return

        try:
            num_people = int(self.spin_people.get())
            if num_people <= 0:
                raise ValueError
        except ValueError:
            messagebox.showwarning("입력 오류", "인원수를 올바르게 입력하세요.")
            return

        rounding = int(self.rounding_var.get())
        total = sum(item["price"] * item["qty"] for item in self.menu_data)

        raw_per = total / num_people
        if rounding > 1:
            per_person = int(math.ceil(raw_per / rounding) * rounding)
        else:
            per_person = int(math.ceil(raw_per))

        over = (per_person * num_people) - total
        account = self.entry_account.get().strip()

        self._render_result(total, num_people, per_person, over, account)

    def _copy_result(self):
        self.root.clipboard_clear()
        self.root.clipboard_append(self.last_result_text)
        messagebox.showinfo("복사 완료", "클립보드에 복사되었습니다!\n카톡이나 메모에 붙여넣기 하세요.")

    # =========================================================================
    # 9번: JSON 불러오기
    # =========================================================================

    def _load_json(self):
        """
        JSON 파일에서 메뉴 데이터를 불러온다.
        
        지원 형식:
        {
            "menu": [
                {"name": "삼겹살", "price": 6000, "qty": 3},
                {"name": "공기밥", "price": 1000, "qty": 1}
            ],
            "num_people": 4  (선택)
        }
        
        또는 리스트 형태도 허용:
        [
            {"name": "삼겹살", "price": 6000, "qty": 3},
            ...
        ]
        """
        filepath = filedialog.askopenfilename(
            title="JSON 파일 불러오기",
            filetypes=[("JSON 파일", "*.json"), ("모든 파일", "*.*")],
            initialdir=os.path.dirname(os.path.abspath(__file__))
        )

        if not filepath:
            return

        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            messagebox.showerror("불러오기 실패", f"JSON 파일을 읽을 수 없습니다.\n{e}")
            return

        # 형식 파싱
        menu_list = []
        num_people = None

        if isinstance(data, list):
            menu_list = data
        elif isinstance(data, dict):
            menu_list = data.get("menu", data.get("items", data.get("order", [])))
            num_people = data.get("num_people", data.get("people", None))
        else:
            messagebox.showerror("형식 오류", "지원하지 않는 JSON 형식입니다.")
            return

        if not menu_list:
            messagebox.showwarning("데이터 없음", "메뉴 항목이 없습니다.")
            return

        # 메뉴 데이터 추가
        added = 0
        for item in menu_list:
            name = item.get("name", item.get("menu_name", ""))
            price = item.get("price", item.get("unit_price", 0))
            qty = item.get("qty", item.get("quantity", 1))

            if name and price > 0:
                self.menu_data.append({"name": name, "price": int(price), "qty": int(qty)})
                added += 1

        # 인원수 설정
        if num_people and num_people > 0:
            self.spin_people.delete(0, "end")
            self.spin_people.insert(0, str(int(num_people)))

        self._refresh_list()
        messagebox.showinfo("불러오기 완료", f"{added}개 메뉴를 불러왔습니다.")

    # =========================================================================
    # 결과 렌더링
    # =========================================================================

    def _render_result(self, total, num_people, per_person, over, account):
        for w in self.result_inner.winfo_children():
            w.destroy()

        bg = self.RES_BG

        # 1인당 금액 (크게)
        tk.Label(self.result_inner, text="1인당 금액", font=(self.FONT, 10),
                 bg=bg, fg=self.RES_ACCENT).pack(pady=(0, 2))

        tk.Label(self.result_inner, text=f"{per_person:,}원",
                 font=(self.FONT, 32, "bold"), bg=bg, fg=self.RES_GOLD).pack()

        # 구분선
        tk.Frame(self.result_inner, bg=self.RES_DIVIDER, height=1).pack(
            fill="x", padx=10, pady=12)

        # 상세
        details = [
            ("주문 총액", f"{total:,}원"),
            ("인원", f"{num_people}명"),
        ]
        if over > 0:
            details.append(("올림 차액", f"+{over:,}원"))

        for label, value in details:
            row = tk.Frame(self.result_inner, bg=bg)
            row.pack(fill="x", pady=2)
            tk.Label(row, text=label, font=(self.FONT, 10), bg=bg,
                     fg="#818cf8", anchor="w").pack(side="left")
            tk.Label(row, text=value, font=(self.FONT, 10, "bold"), bg=bg,
                     fg=self.RES_FG, anchor="e").pack(side="right")

        # 구분선
        tk.Frame(self.result_inner, bg=self.RES_DIVIDER, height=1).pack(
            fill="x", padx=10, pady=12)

        # 송금 메시지
        msg_frame = tk.Frame(self.result_inner, bg="#312e81")
        msg_frame.pack(fill="x", pady=(0, 4))
        tk.Label(msg_frame, text=f"각자 {per_person:,}원씩 보내주세요!",
                 font=(self.FONT, 11, "bold"), bg="#312e81", fg="#c4b5fd",
                 pady=8).pack()

        # 7번: 계좌 정보 표시
        if account:
            tk.Label(msg_frame, text=f"계좌: {account}",
                     font=(self.FONT, 10), bg="#312e81", fg="#e0e7ff",
                     pady=(0)).pack(pady=(0, 8))

        # 복사 버튼
        tk.Button(self.result_inner, text="결과 복사하기",
                  font=(self.FONT, 10, "bold"),
                  bg=self.RES_ACCENT, fg="white", bd=0, cursor="hand2",
                  activebackground="#8b5cf6", activeforeground="white",
                  padx=16, pady=8, command=self._copy_result).pack(pady=(8, 4))

        # 복사용 텍스트 생성
        lines = []
        lines.append("[ 더치페이 계산 결과 ]")
        lines.append("")
        for item in self.menu_data:
            lines.append(f"  {item['name']}  {item['price']:,}원 x {item['qty']}개 = {item['price'] * item['qty']:,}원")
        lines.append(f"  ─────────────────")
        lines.append(f"  총액: {total:,}원")
        lines.append(f"  인원: {num_people}명")
        lines.append(f"")
        lines.append(f"  ▶ 1인당: {per_person:,}원")
        if over > 0:
            lines.append(f"  (올림 +{over:,}원 포함)")
        lines.append(f"")
        lines.append(f"  각자 {per_person:,}원씩 보내주세요!")
        if account:
            lines.append(f"  송금 계좌: {account}")
        self.last_result_text = "\n".join(lines)

    # =========================================================================
    # 실행
    # =========================================================================

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    app = CostCalculatorApp()
    app.run()
