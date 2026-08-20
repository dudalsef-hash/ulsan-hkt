"""
=============================================================================
모듈명: cost_calculator.py
역할: 총액·인분·더치페이 계산 (룰 베이스, AI 의존 없음)
작성자: [팀원명]
버전: 1.0.0
=============================================================================

설명:
  - 사용자가 직접 입력한 메뉴 항목, 수량, 단가, 인원수를 기반으로
    총액 계산, 1인분 단가 계산, 더치페이(균등/차등) 분배를 수행한다.
  - 모든 계산은 룰 베이스(규칙 기반) 알고리즘으로 동작하며,
    외부 AI/ML 모델에 대한 의존성이 없다.

의존성: Python 3.8+ (표준 라이브러리만 사용)
=============================================================================
"""

from dataclasses import dataclass, field
from typing import Optional
import math


# =============================================================================
# 데이터 타입 정의
# =============================================================================

@dataclass
class MenuItem:
    """메뉴 항목 데이터 타입"""
    name: str           # 메뉴명
    unit_price: int     # 단가 (원)
    quantity: int       # 수량
    note: str = ""      # 비고 (알레르기 정보 등)

    @property
    def subtotal(self) -> int:
        """항목별 소계"""
        return self.unit_price * self.quantity


@dataclass
class Participant:
    """참가자 데이터 타입"""
    name: str                           # 참가자 이름
    weight: float = 1.0                 # 차등 분배 가중치 (기본 1.0)
    excluded_items: list = field(default_factory=list)  # 제외 항목 (알레르기 등)


@dataclass
class CostResult:
    """계산 결과 데이터 타입"""
    total_amount: int                   # 총액
    num_participants: int               # 참가 인원수
    per_person_equal: int               # 균등 분배 1인당 금액
    per_person_detail: dict = field(default_factory=dict)  # 차등 분배 상세
    remainder: int = 0                  # 나머지 (균등 분배 시 끝전 처리)
    items_summary: list = field(default_factory=list)      # 항목별 요약


# =============================================================================
# 핵심 계산 엔진 (룰 베이스)
# =============================================================================

class CostCalculator:
    """
    총액·인분·더치페이 계산기 (룰 베이스)

    규칙:
      R1. 총액 = Σ(단가 × 수량)  (모든 메뉴 항목의 합)
      R2. 균등 분배 = 총액 ÷ 인원수 (올림 처리 옵션)
      R3. 차등 분배 = 총액 × (개인 가중치 ÷ 전체 가중치 합)
      R4. 끝전 처리 = 100원/1000원 단위 올림 선택 가능
      R5. 나머지 금액 = 총액 - (분배금 합계), 첫 번째 사람에게 추가
    """

    def __init__(self, rounding_unit: int = 100):
        """
        Args:
            rounding_unit: 끝전 올림 단위 (100 또는 1000, 기본 100원 단위)
        """
        self.menu_items: list[MenuItem] = []
        self.participants: list[Participant] = []
        self.rounding_unit = rounding_unit

    # -------------------------------------------------------------------------
    # 입력 메서드
    # -------------------------------------------------------------------------

    def add_menu_item(self, name: str, unit_price: int, quantity: int, note: str = "") -> None:
        """메뉴 항목 추가"""
        if unit_price < 0:
            raise ValueError(f"단가는 0 이상이어야 합니다: {unit_price}")
        if quantity <= 0:
            raise ValueError(f"수량은 1 이상이어야 합니다: {quantity}")
        self.menu_items.append(MenuItem(name=name, unit_price=unit_price, quantity=quantity, note=note))

    def add_participant(self, name: str, weight: float = 1.0, excluded_items: list = None) -> None:
        """참가자 추가"""
        if weight <= 0:
            raise ValueError(f"가중치는 0보다 커야 합니다: {weight}")
        self.participants.append(
            Participant(name=name, weight=weight, excluded_items=excluded_items or [])
        )

    def set_participants_count(self, count: int) -> None:
        """단순 인원수만 설정 (이름 없이)"""
        if count <= 0:
            raise ValueError(f"인원수는 1 이상이어야 합니다: {count}")
        self.participants = [Participant(name=f"참가자{i+1}") for i in range(count)]

    # -------------------------------------------------------------------------
    # 계산 메서드 (룰 베이스 알고리즘)
    # -------------------------------------------------------------------------

    def calculate_total(self) -> int:
        """
        [R1] 총액 계산
        규칙: 총액 = Σ(단가 × 수량)
        """
        return sum(item.subtotal for item in self.menu_items)

    def calculate_per_person_equal(self, round_up: bool = True) -> tuple[int, int]:
        """
        [R2] 균등 분배 (1인당 금액)
        규칙: 1인당 = 총액 ÷ 인원수 (올림 처리)

        Args:
            round_up: True면 rounding_unit 단위로 올림, False면 내림

        Returns:
            (1인당 금액, 나머지 금액)
        """
        total = self.calculate_total()
        num = len(self.participants)

        if num == 0:
            raise ValueError("참가자가 없습니다. 인원을 먼저 설정하세요.")

        raw_per_person = total / num

        if round_up:
            per_person = self._round_up(raw_per_person)
        else:
            per_person = self._round_down(raw_per_person)

        remainder = total - (per_person * num)
        return per_person, remainder

    def calculate_dutch_pay_weighted(self) -> dict[str, int]:
        """
        [R3] 차등 분배 (가중치 기반 더치페이)
        규칙: 개인 금액 = 총액 × (개인 가중치 ÷ 전체 가중치 합)

        Returns:
            {참가자명: 분배금액} 딕셔너리
        """
        total = self.calculate_total()
        num = len(self.participants)

        if num == 0:
            raise ValueError("참가자가 없습니다. 인원을 먼저 설정하세요.")

        total_weight = sum(p.weight for p in self.participants)
        result = {}
        allocated = 0

        for i, participant in enumerate(self.participants):
            if i == num - 1:
                # [R5] 마지막 사람은 나머지 전부 (끝전 오차 방지)
                amount = total - allocated
            else:
                raw_amount = total * (participant.weight / total_weight)
                amount = self._round_down(raw_amount)
                allocated += amount

            result[participant.name] = amount

        return result

    def calculate_dutch_pay_by_consumption(self) -> dict[str, int]:
        """
        [R3 확장] 소비 기반 차등 분배
        규칙: 참가자가 제외한 항목을 빼고, 나머지 항목을 참여 인원으로 나눔

        Returns:
            {참가자명: 분배금액} 딕셔너리
        """
        num = len(self.participants)
        if num == 0:
            raise ValueError("참가자가 없습니다. 인원을 먼저 설정하세요.")

        result = {p.name: 0 for p in self.participants}

        for item in self.menu_items:
            # 이 항목에 참여하는 사람 목록
            participants_for_item = [
                p for p in self.participants
                if item.name not in p.excluded_items
            ]

            if not participants_for_item:
                # 아무도 먹지 않은 항목 → 전체 균등 분배
                participants_for_item = self.participants

            share = self._round_down(item.subtotal / len(participants_for_item))
            remainder = item.subtotal - (share * len(participants_for_item))

            for j, p in enumerate(participants_for_item):
                amount = share + (1 if j < remainder else 0)
                result[p.name] += amount

        return result

    # -------------------------------------------------------------------------
    # 결과 종합
    # -------------------------------------------------------------------------

    def get_full_result(self, mode: str = "equal") -> CostResult:
        """
        전체 계산 결과 반환

        Args:
            mode: "equal" (균등분배) | "weighted" (가중치) | "consumption" (소비기반)

        Returns:
            CostResult 데이터 객체
        """
        total = self.calculate_total()
        num = len(self.participants)

        per_person_equal, remainder = self.calculate_per_person_equal(round_up=False)

        if mode == "weighted":
            detail = self.calculate_dutch_pay_weighted()
        elif mode == "consumption":
            detail = self.calculate_dutch_pay_by_consumption()
        else:
            detail = {p.name: per_person_equal for p in self.participants}
            # 나머지 첫 번째 사람에게 추가
            if remainder != 0 and self.participants:
                first = self.participants[0].name
                detail[first] += remainder

        items_summary = [
            {"name": item.name, "unit_price": item.unit_price,
             "quantity": item.quantity, "subtotal": item.subtotal}
            for item in self.menu_items
        ]

        return CostResult(
            total_amount=total,
            num_participants=num,
            per_person_equal=per_person_equal,
            per_person_detail=detail,
            remainder=remainder,
            items_summary=items_summary,
        )

    # -------------------------------------------------------------------------
    # 유틸리티 (끝전 처리)
    # -------------------------------------------------------------------------

    def _round_up(self, value: float) -> int:
        """[R4] 올림 처리 (rounding_unit 단위)"""
        return int(math.ceil(value / self.rounding_unit) * self.rounding_unit)

    def _round_down(self, value: float) -> int:
        """[R4] 내림 처리 (rounding_unit 단위)"""
        return int(math.floor(value / self.rounding_unit) * self.rounding_unit)

    # -------------------------------------------------------------------------
    # 출력 포맷
    # -------------------------------------------------------------------------

    def print_summary(self, mode: str = "equal") -> str:
        """사람이 읽기 편한 요약 문자열 반환"""
        result = self.get_full_result(mode)

        mode_label = {"equal": "균등 분배 (N빵)", "weighted": "가중치 분배", "consumption": "소비 기반 분배"}
        W = 56  # 출력 폭

        lines = []
        lines.append("")
        lines.append("+" + "=" * W + "+")
        lines.append("|" + " 비용 계산 결과 ".center(W) + "|")
        lines.append("+" + "=" * W + "+")

        # 주문 내역 섹션
        lines.append("|" + " " * W + "|")
        lines.append("|" + "  [ 주문 내역 ]".ljust(W) + "|")
        lines.append("|" + "-" * W + "|")
        lines.append("|" + f"  {'메뉴':<10s}{'단가':>10s}{'수량':>6s}{'소계':>14s}  ".ljust(W) + "|")
        lines.append("|" + "-" * W + "|")

        for item in result.items_summary:
            row = f"  {item['name']:<10s}{item['unit_price']:>8,}원{item['quantity']:>4}개{item['subtotal']:>12,}원  "
            lines.append("|" + row.ljust(W) + "|")

        lines.append("|" + "-" * W + "|")
        total_row = f"  {'합계':<10s}{'':>10s}{'':>6s}{result.total_amount:>12,}원  "
        lines.append("|" + total_row.ljust(W) + "|")

        # 분배 정보 섹션
        lines.append("|" + " " * W + "|")
        lines.append("+" + "-" * W + "+")
        lines.append("|" + " " * W + "|")
        lines.append("|" + f"  [ 분배 정보 ]".ljust(W) + "|")
        lines.append("|" + f"    방식 : {mode_label.get(mode, mode)}".ljust(W) + "|")
        lines.append("|" + f"    인원 : {result.num_participants}명".ljust(W) + "|")
        lines.append("|" + " " * W + "|")
        lines.append("|" + "-" * W + "|")
        lines.append("|" + f"  {'이름':<12s}{'금액':>16s}{'비율':>12s}  ".ljust(W) + "|")
        lines.append("|" + "-" * W + "|")

        for name, amount in result.per_person_detail.items():
            pct = (amount / result.total_amount * 100) if result.total_amount > 0 else 0
            row = f"  {name:<12s}{amount:>14,}원{pct:>10.1f}%  "
            lines.append("|" + row.ljust(W) + "|")

        lines.append("|" + "-" * W + "|")

        # 검증 합계
        detail_sum = sum(result.per_person_detail.values())
        check = "OK" if detail_sum == result.total_amount else f"차액 {result.total_amount - detail_sum:,}원"
        verify_row = f"  {'검증':<12s}{detail_sum:>14,}원{'(' + check + ')':>12s}  "
        lines.append("|" + verify_row.ljust(W) + "|")

        # 나머지 안내
        if result.remainder != 0 and mode == "equal":
            lines.append("|" + " " * W + "|")
            note = f"  * 끝전 {abs(result.remainder):,}원 → 첫 번째 참가자에게 추가"
            lines.append("|" + note.ljust(W) + "|")

        lines.append("|" + " " * W + "|")
        lines.append("+" + "=" * W + "+")
        lines.append("")

        return "\n".join(lines)


# =============================================================================
# CLI 인터페이스 (사용자 직접 입력)
# =============================================================================

def run_interactive():
    """대화형 CLI - 사용자가 직접 값을 입력"""
    print("=" * 50)
    print("   총액·인분·더치페이 계산기 (룰 베이스)")
    print("=" * 50)
    print()

    calc = CostCalculator()

    # --- 끝전 단위 설정 ---
    print("[설정] 끝전 올림 단위를 선택하세요:")
    print("  1) 100원 단위")
    print("  2) 1000원 단위")
    print("  3) 올림 없음 (1원 단위)")
    rounding_choice = input("선택 (1/2/3, 기본 1): ").strip() or "1"
    rounding_map = {"1": 100, "2": 1000, "3": 1}
    calc.rounding_unit = rounding_map.get(rounding_choice, 100)
    print()

    # --- 메뉴 항목 입력 ---
    print("[입력] 메뉴 항목을 입력하세요 (완료 시 빈 줄 입력)")
    print("  형식: 메뉴명, 단가(원), 수량")
    print("  예시: 삼겹살, 15000, 3")
    print()

    while True:
        line = input("  메뉴 입력> ").strip()
        if not line:
            break
        try:
            parts = [p.strip() for p in line.split(",")]
            if len(parts) < 3:
                print("  ⚠ 형식 오류. '메뉴명, 단가, 수량' 형식으로 입력하세요.")
                continue
            name, price, qty = parts[0], int(parts[1]), int(parts[2])
            note = parts[3] if len(parts) > 3 else ""
            calc.add_menu_item(name, price, qty, note)
            print(f"    ✓ 추가: {name} ({price:,}원 × {qty}개)")
        except (ValueError, IndexError) as e:
            print(f"  ⚠ 입력 오류: {e}")

    if not calc.menu_items:
        print("메뉴가 없습니다. 종료합니다.")
        return

    print()

    # --- 인원 및 분배 방식 ---
    print("[입력] 분배 방식을 선택하세요:")
    print("  1) 균등 분배 (N빵)")
    print("  2) 가중치 분배 (직급/나이 등)")
    print("  3) 소비 기반 분배 (먹은 만큼)")
    mode_choice = input("선택 (1/2/3, 기본 1): ").strip() or "1"
    mode_map = {"1": "equal", "2": "weighted", "3": "consumption"}
    mode = mode_map.get(mode_choice, "equal")
    print()

    if mode == "equal":
        count = int(input("[입력] 참가 인원수: ").strip())
        calc.set_participants_count(count)

    elif mode == "weighted":
        print("[입력] 참가자 정보 (완료 시 빈 줄)")
        print("  형식: 이름, 가중치")
        print("  예시: 김팀장, 1.5")
        while True:
            line = input("  참가자 입력> ").strip()
            if not line:
                break
            try:
                parts = [p.strip() for p in line.split(",")]
                name = parts[0]
                weight = float(parts[1]) if len(parts) > 1 else 1.0
                calc.add_participant(name, weight)
                print(f"    ✓ 추가: {name} (가중치 {weight})")
            except (ValueError, IndexError) as e:
                print(f"  ⚠ 입력 오류: {e}")

    elif mode == "consumption":
        print("[입력] 참가자 정보 (완료 시 빈 줄)")
        print("  형식: 이름, 제외항목1;제외항목2")
        print("  예시: 홍길동, 삼겹살;새우")
        while True:
            line = input("  참가자 입력> ").strip()
            if not line:
                break
            try:
                parts = [p.strip() for p in line.split(",")]
                name = parts[0]
                excluded = [x.strip() for x in parts[1].split(";")] if len(parts) > 1 and parts[1] else []
                calc.add_participant(name, excluded_items=excluded)
                print(f"    ✓ 추가: {name} (제외: {excluded if excluded else '없음'})")
            except (ValueError, IndexError) as e:
                print(f"  ⚠ 입력 오류: {e}")

    print()
    print(calc.print_summary(mode))


# =============================================================================
# 엔트리포인트
# =============================================================================

if __name__ == "__main__":
    run_interactive()
