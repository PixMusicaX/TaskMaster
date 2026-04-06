"use client";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Calendar() {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  // This creates the array of days to map over (usually 35 or 42 days)
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="p-4 bg-white rounded-xl shadow-lg text-black">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{format(monthStart, "MMMM yyyy")}</h2>
        <div className="flex gap-2">
          <ChevronLeft className="cursor-pointer" />
          <ChevronRight className="cursor-pointer" />
        </div>
      </div>

      {/* The 7-column Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="bg-gray-100 p-2 text-center text-sm font-semibold">
            {d}
          </div>
        ))}

        {calendarDays.map((day) => (
          <div 
            key={day.toString()} 
            className={`h-24 bg-white p-2 border-t transition-colors hover:bg-blue-50 cursor-pointer 
              ${!isSameMonth(day, monthStart) ? "text-gray-300" : "text-gray-900"}`}
          >
            <span className="text-sm">{format(day, "d")}</span>
            {/* This is where your Rust data indicators will go later! */}
          </div>
        ))}
      </div>
    </div>
  );
}