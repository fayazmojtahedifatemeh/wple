import { PriceHistoryChart } from "../PriceHistoryChart";

export default function PriceHistoryChartExample() {
  const mockData = [
    { date: "Jan 1", price: 150 },
    { date: "Jan 15", price: 145 },
    { date: "Feb 1", price: 152 },
    { date: "Feb 15", price: 138 },
    { date: "Mar 1", price: 130 },
    { date: "Mar 15", price: 129.99 },
  ];

  return (
    <div className="p-8 max-w-3xl">
      <PriceHistoryChart data={mockData} currency="$" />
    </div>
  );
}
