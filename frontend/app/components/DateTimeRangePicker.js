"use client";

import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { es } from "date-fns/locale";

export default function DateTimeRangePicker({ onChange }) {
  const [range, setRange] = useState([null, null]);
  const [start, end] = range;

  return (
    <DatePicker
      selectsRange
      startDate={start}
      endDate={end}
      selected={start}
      onChange={(update) => {
        setRange(update);
        if (update[0] && update[1]) {
          onChange(update);
        }
      }}
      showTimeSelect
      timeFormat="HH:mm"
      timeIntervals={30}
      dateFormat="dd/MM/yyyy HH:mm"
      locale={es}
      placeholderText="Selecciona rango de fecha y hora"
      className="w-full border p-2 rounded"
    />
  );
}