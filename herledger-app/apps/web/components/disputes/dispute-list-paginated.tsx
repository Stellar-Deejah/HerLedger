"use client";

import { useState, useEffect, useCallback } from "react";

interface Dispute {
  id: string;
  eventId: string;
  reasonHash: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface DisputeListPaginatedProps {
  businessId: string;
  pageSize?: number;
  maxLimit?: number;
}

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function DisputeListPaginated({
  businessId,
  pageSize: initialPageSize = 10,
  maxLimit = 50,
}: DisputeListPaginatedProps) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: Math.min(initialPageSize, maxLimit),
    total: 0,
    totalPages: 0,
  });

  const fetchDisputes = useCallback(async (page: number, limit: number) => {
    setLoading(true);
    setError(null);

    try {
      const offset = (page - 1) * limit;
      const response = await fetch(
        `/api/disputes?businessId=${businessId}&offset=${offset}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch disputes");
      }

      const data = await response.json();
      
      setDisputes(data.disputes || []);
      setPagination({
        page,
        pageSize: limit,
        total: data.total || 0,
        totalPages: Math.ceil((data.total || 0) / limit),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch disputes");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchDisputes(1, pagination.pageSize);
  }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchDisputes(newPage, pagination.pageSize);
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    const clampedSize = Math.min(newPageSize, maxLimit);
    fetchDisputes(1, clampedSize);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "disputed":
        return "var(--warning, #eab308)";
      case "resolved":
        return "var(--success, #22c55e)";
      case "dismissed":
        return "var(--muted, #6b7280)";
      default:
        return "var(--info, #3b82f6)";
    }
  };

  if (loading && disputes.length === 0) {
    return <p style={{ color: "var(--muted)" }}>Loading disputes...</p>;
  }

  if (error && disputes.length === 0) {
    return (
      <div style={{ color: "var(--error, #ef4444)" }}>
        <p>{error}</p>
        <button
          onClick={() => fetchDisputes(pagination.page, pagination.pageSize)}
          style={{ marginTop: "0.5rem" }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>
          Disputes ({pagination.total})
        </h3>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <label style={{ fontSize: "0.875rem", color: "var(--muted)" }}>
            Show:
          </label>
          <select
            value={pagination.pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            style={{
              padding: "0.25rem 0.5rem",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              fontSize: "0.875rem",
            }}
          >
            {[5, 10, 20, 50].map((size) => (
              <option key={size} value={size} disabled={size > maxLimit}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {disputes.length === 0 ? (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            color: "var(--muted)",
          }}
        >
          No disputes found
        </div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.875rem",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border)",
                    textAlign: "left",
                  }}
                >
                  <th style={{ padding: "0.75rem" }}>Event ID</th>
                  <th style={{ padding: "0.75rem" }}>Reason Hash</th>
                  <th style={{ padding: "0.75rem" }}>Status</th>
                  <th style={{ padding: "0.75rem" }}>Created</th>
                  <th style={{ padding: "0.75rem" }}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {disputes.map((dispute) => (
                  <tr
                    key={dispute.id}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td style={{ padding: "0.75rem", fontFamily: "monospace" }}>
                      {dispute.eventId.slice(0, 8)}...
                    </td>
                    <td style={{ padding: "0.75rem", fontFamily: "monospace", fontSize: "0.75rem" }}>
                      {dispute.reasonHash.slice(0, 16)}...
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      <span
                        style={{
                          padding: "0.25rem 0.5rem",
                          borderRadius: "var(--radius)",
                          backgroundColor: getStatusColor(dispute.status),
                          color: "white",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                        }}
                      >
                        {dispute.status}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      {formatDate(dispute.createdAt)}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      {formatDate(dispute.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "1rem",
              paddingTop: "1rem",
              borderTop: "1px solid var(--border)",
            }}
          >
            <p style={{ fontSize: "0.875rem", color: "var(--muted)" }}>
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => handlePageChange(1)}
                disabled={pagination.page === 1 || loading}
                style={{
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.875rem",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  backgroundColor: "var(--background)",
                  cursor: pagination.page === 1 || loading ? "not-allowed" : "pointer",
                  opacity: pagination.page === 1 || loading ? 0.5 : 1,
                }}
              >
                First
              </button>
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1 || loading}
                style={{
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.875rem",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  backgroundColor: "var(--background)",
                  cursor: pagination.page === 1 || loading ? "not-allowed" : "pointer",
                  opacity: pagination.page === 1 || loading ? 0.5 : 1,
                }}
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages || loading}
                style={{
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.875rem",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  backgroundColor: "var(--background)",
                  cursor: pagination.page === pagination.totalPages || loading ? "not-allowed" : "pointer",
                  opacity: pagination.page === pagination.totalPages || loading ? 0.5 : 1,
                }}
              >
                Next
              </button>
              <button
                onClick={() => handlePageChange(pagination.totalPages)}
                disabled={pagination.page === pagination.totalPages || loading}
                style={{
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.875rem",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  backgroundColor: "var(--background)",
                  cursor: pagination.page === pagination.totalPages || loading ? "not-allowed" : "pointer",
                  opacity: pagination.page === pagination.totalPages || loading ? 0.5 : 1,
                }}
              >
                Last
              </button>
            </div>
          </div>
        </>
      )}

      {loading && disputes.length > 0 && (
        <p
          style={{
            textAlign: "center",
            color: "var(--muted)",
            marginTop: "1rem",
          }}
        >
          Loading...
        </p>
      )}
    </div>
  );
}
