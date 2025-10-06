import styles from './Calendar.module.scss';

export const calendarMock: CalendarItem[] = [
  { id: 1, dayNumber: 9,  dayName: "Пн", isToday: true },
  { id: 2, dayNumber: 10, dayName: "Вт" },
  { id: 3, dayNumber: 11, dayName: "Ср" },
  { id: 4, dayNumber: 12, dayName: "Чт" },
  { id: 5, dayNumber: 13, dayName: "Пт" },
  { id: 6, dayNumber: 14, dayName: "Сб" },
  { id: 7, dayNumber: 15, dayName: "Вс" },
];

interface CalendarItem {
  id: number;
  dayNumber: number;
  dayName: string;
 isToday?: boolean;
}

export const Calendar = () => {
  // глобальное переключение
function toggleTheme() {
  document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", 
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );
}

// применяем сохранённую тему при загрузке
if (localStorage.getItem("theme") === "dark") {
  document.documentElement.classList.add("dark");
}

  return (
    <div className={styles.calendar} onClick={toggleTheme}>
      {calendarMock.map((item) => (
        <div className={`${styles.calendarItem} ${item.isToday ? styles.isToday : ''}`} key={item.id}>
          <span className={styles.dayName}>{item.dayName}</span>
          <span className={styles.dayNumber}>{item.dayNumber}</span>
        </div>
      ))}
    </div>
  );
}