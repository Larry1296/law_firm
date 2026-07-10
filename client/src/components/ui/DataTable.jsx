// src/components/ui/DataTable.jsx

import React from 'react';
import Card from '@/components/ui/Card';

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No records found.',
  mobileTitleKey = null,
  mobileSubtitleKey = null,
  actions = null,
}) {
  if (loading) {
    return (
      <Card className='p-6'>
        <div className='flex items-center justify-center py-12'>
          <p className='text-slate-500 dark:text-text-muted-dark'>Loading...</p>
        </div>
      </Card>
    );
  }

  if (!data?.length) {
    return (
      <Card className='p-6'>
        <div className='flex items-center justify-center py-12'>
          <p className='text-slate-500 dark:text-text-muted-dark'>
            {emptyMessage}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      {/* ====================================================== */}
      {/* MOBILE + TABLET CARDS */}
      {/* ====================================================== */}
      <div className='grid gap-4 lg:hidden'>
        {data.map((row, index) => (
          <Card
            key={row.id || row.client_id || row.uuid || index}
            className='p-5 animate-fadeIn'
          >
            <div className='space-y-4'>
              {/* HEADER */}
              {(mobileTitleKey || mobileSubtitleKey) && (
                <div className='border-b border-border-light dark:border-border-dark pb-3'>
                  {mobileTitleKey && (
                    <h3 className='font-semibold text-lg text-slate-900 dark:text-white'>
                      {row[mobileTitleKey] ?? '—'}
                    </h3>
                  )}

                  {mobileSubtitleKey && (
                    <p className='text-sm text-slate-500 dark:text-text-muted-dark mt-1'>
                      {row[mobileSubtitleKey] ?? '—'}
                    </p>
                  )}
                </div>
              )}

              {/* FIELDS */}
              <div className='space-y-3'>
                {columns.map((column) => {
                  const value = row[column.key];

                  return (
                    <div
                      key={column.key}
                      className='flex items-start justify-between gap-4'
                    >
                      <span className='text-sm font-medium text-slate-500 dark:text-text-muted-dark'>
                        {column.label}
                      </span>

                      <div className='text-right text-sm font-medium text-slate-900 dark:text-white'>
                        {column.render
                          ? column.render(value, row)
                          : (value ?? '—')}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ACTIONS */}
              {actions && (
                <div className='pt-3 border-t border-border-light dark:border-border-dark'>
                  {actions(row)}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* ====================================================== */}
      {/* DESKTOP TABLE */}
      {/* ====================================================== */}
      <div className='hidden lg:block'>
        <Card className='overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead
                className='
                  bg-slate-100
                  dark:bg-[#18233A]
                  border-b
                  border-border-light
                  dark:border-border-dark
                '
              >
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className='
                        px-6
                        py-4
                        text-left
                        text-sm
                        font-semibold
                        text-slate-700
                        dark:text-white
                        whitespace-nowrap
                      '
                    >
                      {column.label}
                    </th>
                  ))}

                  {actions && (
                    <th
                      className='
                        px-6
                        py-4
                        text-left
                        text-sm
                        font-semibold
                        text-slate-700
                        dark:text-white
                        whitespace-nowrap
                      '
                    >
                      Actions
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {data.map((row, index) => (
                  <tr
                    key={row.id || row.client_id || row.uuid || index}
                    className='
                      border-b
                      border-border-light
                      dark:border-border-dark

                      hover:bg-slate-50
                      dark:hover:bg-[#18233A]

                      transition-colors
                    '
                  >
                    {columns.map((column) => {
                      const value = row[column.key];

                      return (
                        <td
                          key={column.key}
                          className='
                            px-6
                            py-4
                            text-sm
                            text-slate-700
                            dark:text-slate-200
                            align-middle
                          '
                        >
                          {column.render
                            ? column.render(value, row)
                            : (value ?? '—')}
                        </td>
                      );
                    })}

                    {actions && (
                      <td
                        className='
                          px-6
                          py-4
                          text-sm
                          text-slate-700
                          dark:text-slate-200
                        '
                      >
                        {actions(row)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
