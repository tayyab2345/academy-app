import { prisma } from "@/lib/prisma"
import { renderPdfFromHtml } from "@/lib/pdf/browser"
import {
  AcademyBranding,
  buildPDFFilename,
  escapeHtml,
  formatCurrencyForPDF,
  formatDateForPDF,
  resolvePdfImageSource,
  renderAcademyHeader,
  renderPDFFooter,
  renderTextBlock,
} from "@/lib/pdf/pdf-utils"

export interface InvoicePDFData {
  invoice: {
    id: string
    invoiceNumber: string
    invoiceCategory: string
    description: string
    amount: number
    taxAmount: number
    totalAmount: number
    currency: string
    dueDate: Date
    status: string
    issuedAt: Date
    notes: string | null
    pdfUrl: string | null
    studentProfile: {
      studentId: string
      user: {
        firstName: string
        lastName: string
      }
    }
    class: {
      name: string
      course: {
        code: string
        name: string
      }
    } | null
    createdBy: {
      firstName: string
      lastName: string
    }
    payments: {
      id: string
      amount: number
      currency: string
      paymentMethod: string
      paymentDate: Date
      transactionReference: string | null
    }[]
    adjustments: {
      id: string
      type: string
      label: string
      amount: number
    }[]
  }
  academy: AcademyBranding
}

function calculateAdjustmentTotal(adjustments: InvoicePDFData["invoice"]["adjustments"]) {
  return adjustments.reduce((sum, adjustment) => {
    if (adjustment.type === "surcharge") {
      return sum + adjustment.amount
    }

    return sum - adjustment.amount
  }, 0)
}

function calculatePaidAmount(payments: InvoicePDFData["invoice"]["payments"]) {
  return payments.reduce((sum, payment) => sum + payment.amount, 0)
}

export async function fetchInvoicePDFData(invoiceId: string): Promise<InvoicePDFData | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      studentProfile: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              academy: {
                select: {
                  name: true,
                  logoUrl: true,
                  primaryColor: true,
                  secondaryColor: true,
                  contactEmail: true,
                },
              },
            },
          },
        },
      },
      class: {
        include: {
          course: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      payments: {
        where: { status: "completed" },
        orderBy: {
          paymentDate: "asc",
        },
        select: {
          id: true,
          amount: true,
          currency: true,
          paymentMethod: true,
          paymentDate: true,
          transactionReference: true,
        },
      },
      adjustments: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          type: true,
          label: true,
          amount: true,
        },
      },
    },
  })

  if (!invoice) {
    return null
  }

  const academyLogoUrl = await resolvePdfImageSource(
    invoice.studentProfile.user.academy.logoUrl
  )

  return {
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceCategory: invoice.invoiceCategory,
      description: invoice.description,
      amount: Number(invoice.amount),
      taxAmount: Number(invoice.taxAmount),
      totalAmount: Number(invoice.totalAmount),
      currency: invoice.currency,
      dueDate: invoice.dueDate,
      status: invoice.status,
      issuedAt: invoice.issuedAt,
      notes: invoice.notes,
      pdfUrl: invoice.pdfUrl,
      studentProfile: {
        studentId: invoice.studentProfile.studentId,
        user: {
          firstName: invoice.studentProfile.user.firstName,
          lastName: invoice.studentProfile.user.lastName,
        },
      },
      class: invoice.class
        ? {
            name: invoice.class.name,
            course: {
              code: invoice.class.course.code,
              name: invoice.class.course.name,
            },
          }
        : null,
      createdBy: {
        firstName: invoice.createdBy.firstName,
        lastName: invoice.createdBy.lastName,
      },
      payments: invoice.payments.map((payment) => ({
        id: payment.id,
        amount: Number(payment.amount),
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        paymentDate: payment.paymentDate,
        transactionReference: payment.transactionReference,
      })),
      adjustments: invoice.adjustments.map((adjustment) => ({
        id: adjustment.id,
        type: adjustment.type,
        label: adjustment.label,
        amount: Number(adjustment.amount),
      })),
    },
    academy: {
      name: invoice.studentProfile.user.academy.name,
      logoUrl: academyLogoUrl,
      primaryColor: invoice.studentProfile.user.academy.primaryColor,
      secondaryColor: invoice.studentProfile.user.academy.secondaryColor,
      contactEmail: invoice.studentProfile.user.academy.contactEmail,
    },
  }
}

function renderInvoiceHTML(data: InvoicePDFData) {
  const { academy, invoice } = data
  const adjustmentTotal = calculateAdjustmentTotal(invoice.adjustments)
  const paidAmount = calculatePaidAmount(invoice.payments)
  const adjustedTotal = invoice.totalAmount + adjustmentTotal
  const outstanding = Math.max(adjustedTotal - paidAmount, 0)

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: #111827;
            margin: 0;
            padding: 24px;
            line-height: 1.5;
          }
          .container {
            max-width: 840px;
            margin: 0 auto;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px 20px;
            background: #f9fafb;
            border-radius: 12px;
            padding: 18px;
            margin-bottom: 24px;
          }
          .label {
            color: #6b7280;
            font-weight: 600;
            margin-right: 6px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }
          th, td {
            border-bottom: 1px solid #e5e7eb;
            padding: 10px 0;
            text-align: left;
            vertical-align: top;
          }
          th {
            color: #6b7280;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .amount {
            text-align: right;
          }
          .card {
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 18px;
            margin-bottom: 18px;
            page-break-inside: avoid;
          }
          .section-title {
            color: ${academy.primaryColor};
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${renderAcademyHeader(academy)}

          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
            <div>
              <h2 style="margin: 0 0 6px;">Invoice ${escapeHtml(invoice.invoiceNumber)}</h2>
              <p style="margin: 0; color: #6b7280; text-transform: capitalize;">
                ${escapeHtml(invoice.invoiceCategory)} • ${escapeHtml(invoice.status)}
              </p>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 28px; font-weight: 700; color: ${academy.primaryColor};">
                ${formatCurrencyForPDF(adjustedTotal, invoice.currency)}
              </div>
              <div style="color: #6b7280;">Outstanding: ${formatCurrencyForPDF(outstanding, invoice.currency)}</div>
            </div>
          </div>

          <div class="summary-grid">
            <div>
              <span class="label">Student:</span>
              ${escapeHtml(invoice.studentProfile.user.firstName)} ${escapeHtml(
                invoice.studentProfile.user.lastName
              )} (${escapeHtml(invoice.studentProfile.studentId)})
            </div>
            <div>
              <span class="label">Issue Date:</span>
              ${formatDateForPDF(invoice.issuedAt)}
            </div>
            <div>
              <span class="label">Class:</span>
              ${
                invoice.class
                  ? `${escapeHtml(invoice.class.course.code)}: ${escapeHtml(invoice.class.name)}`
                  : "General invoice"
              }
            </div>
            <div>
              <span class="label">Due Date:</span>
              ${formatDateForPDF(invoice.dueDate)}
            </div>
            <div>
              <span class="label">Created By:</span>
              ${escapeHtml(invoice.createdBy.firstName)} ${escapeHtml(invoice.createdBy.lastName)}
            </div>
          </div>

          <div class="card">
            <div class="section-title">Description</div>
            <p style="margin: 0 0 12px;">${renderTextBlock(invoice.description)}</p>
            ${
              invoice.notes
                ? `
              <div style="margin-top: 12px;">
                <span class="label">Notes:</span>
                <span>${renderTextBlock(invoice.notes)}</span>
              </div>
            `
                : ""
            }
          </div>

          <div class="card">
            <div class="section-title">Charges</div>
            <table>
              <tbody>
                <tr>
                  <td>Subtotal</td>
                  <td class="amount">${formatCurrencyForPDF(invoice.amount, invoice.currency)}</td>
                </tr>
                <tr>
                  <td>Tax</td>
                  <td class="amount">${formatCurrencyForPDF(invoice.taxAmount, invoice.currency)}</td>
                </tr>
                ${invoice.adjustments
                  .map(
                    (adjustment) => `
                  <tr>
                    <td>${escapeHtml(adjustment.label)} (${escapeHtml(adjustment.type)})</td>
                    <td class="amount">${
                      adjustment.type === "surcharge"
                        ? formatCurrencyForPDF(adjustment.amount, invoice.currency)
                        : formatCurrencyForPDF(-adjustment.amount, invoice.currency)
                    }</td>
                  </tr>
                `
                  )
                  .join("")}
                <tr>
                  <td><strong>Total</strong></td>
                  <td class="amount"><strong>${formatCurrencyForPDF(adjustedTotal, invoice.currency)}</strong></td>
                </tr>
                <tr>
                  <td>Paid</td>
                  <td class="amount">${formatCurrencyForPDF(paidAmount, invoice.currency)}</td>
                </tr>
                <tr>
                  <td><strong>Outstanding</strong></td>
                  <td class="amount"><strong>${formatCurrencyForPDF(outstanding, invoice.currency)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          ${
            invoice.payments.length > 0
              ? `
            <div class="card">
              <div class="section-title">Payment History</div>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th class="amount">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoice.payments
                    .map(
                      (payment) => `
                    <tr>
                      <td>${formatDateForPDF(payment.paymentDate)}</td>
                      <td>${escapeHtml(payment.paymentMethod.replace(/_/g, " "))}</td>
                      <td>${escapeHtml(payment.transactionReference || "—")}</td>
                      <td class="amount">${formatCurrencyForPDF(payment.amount, payment.currency)}</td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          `
              : ""
          }

          ${renderPDFFooter(academy)}
        </div>
      </body>
    </html>
  `
}

export async function generateInvoicePDFBuffer(data: InvoicePDFData) {
  return renderPdfFromHtml(renderInvoiceHTML(data))
}

export async function generateInvoicePDF(invoiceId: string) {
  const data = await fetchInvoicePDFData(invoiceId)

  if (!data) {
    return null
  }

  return generateInvoicePDFBuffer(data)
}

export function getInvoicePDFFilename(invoice: InvoicePDFData["invoice"]) {
  const sanitizedInvoiceNumber = invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "_")
  return buildPDFFilename(`invoice_${sanitizedInvoiceNumber}`, invoice.id, invoice.issuedAt)
}
