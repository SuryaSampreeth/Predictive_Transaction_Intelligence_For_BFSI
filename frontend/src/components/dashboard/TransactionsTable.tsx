import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: string;
  channel: string;
  location: string;
  fraudProbability: number;
  isFraud: boolean;
}

interface TransactionsTableProps {
  transactions: Transaction[];
  showFraudOnly?: boolean;
}

const ITEMS_PER_PAGE = 10;

export const TransactionsTable = ({
  transactions,
  showFraudOnly = false,
}: TransactionsTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  const displayTransactions = showFraudOnly
    ? transactions.filter((t) => t.isFraud)
    : transactions;

  const totalPages = Math.ceil(displayTransactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentTransactions = displayTransactions.slice(startIndex, endIndex);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {showFraudOnly ? "Suspicious Transactions" : "Recent Transactions"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentTransactions.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell className="font-mono text-sm">{txn.id}</TableCell>
                  <TableCell>{txn.date}</TableCell>
                  <TableCell className="font-semibold">
                    ₹{txn.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>{txn.channel}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            txn.fraudProbability > 0.7
                              ? "bg-destructive"
                              : txn.fraudProbability > 0.4
                              ? "bg-warning"
                              : "bg-success"
                          }`}
                          style={{ width: `${txn.fraudProbability * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {(txn.fraudProbability * 100).toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={txn.isFraud ? "destructive" : "default"}
                      className={txn.isFraud ? "" : "bg-success text-success-foreground"}
                    >
                      {txn.isFraud ? "Fraud" : "Legitimate"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, displayTransactions.length)} of{" "}
            {displayTransactions.length} transactions
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
