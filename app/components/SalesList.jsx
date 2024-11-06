import {
    IndexTable,
    LegacyCard,
    useIndexResourceState,
    Text,
    Badge,
  } from '@shopify/polaris';
  import React, { useState } from 'react';
  
  export default function SalesList() {
    const orders = [
      { id: '1020', order: '#1020', date: 'Jul 20 at 4:34pm', customer: 'Jaydon Stanton', total: '$969.44', paymentStatus: <Badge progress="complete">Paid</Badge>, fulfillmentStatus: <Badge progress="incomplete">Unfulfilled</Badge> },
      { id: '1019', order: '#1019', date: 'Jul 20 at 3:46pm', customer: 'Ruben Westerfelt', total: '$701.19', paymentStatus: <Badge progress="partiallyComplete">Partially paid</Badge>, fulfillmentStatus: <Badge progress="incomplete">Unfulfilled</Badge> },
      { id: '1018', order: '#1018', date: 'Jul 20 at 3:44pm', customer: 'Leo Carder', total: '$798.24', paymentStatus: <Badge progress="complete">Paid</Badge>, fulfillmentStatus: <Badge progress="incomplete">Unfulfilled</Badge> },
      { id: '1017', order: '#1017', date: 'Jul 19 at 2:34pm', customer: 'Blair Alvarez', total: '$428.60', paymentStatus: <Badge progress="complete">Paid</Badge>, fulfillmentStatus: <Badge progress="complete">Fulfilled</Badge> },
      { id: '1016', order: '#1016', date: 'Jul 19 at 2:10pm', customer: 'Arjun Patel', total: '$624.33', paymentStatus: <Badge progress="incomplete">Unpaid</Badge>, fulfillmentStatus: <Badge progress="incomplete">Unfulfilled</Badge> },
      { id: '1015', order: '#1015', date: 'Jul 18 at 11:23am', customer: 'Selena Moreno', total: '$312.78', paymentStatus: <Badge progress="complete">Paid</Badge>, fulfillmentStatus: <Badge progress="complete">Fulfilled</Badge> },
      { id: '1014', order: '#1014', date: 'Jul 18 at 10:02am', customer: 'Mila Benson', total: '$249.50', paymentStatus: <Badge progress="incomplete">Unpaid</Badge>, fulfillmentStatus: <Badge progress="incomplete">Unfulfilled</Badge> },
      { id: '1013', order: '#1013', date: 'Jul 17 at 5:17pm', customer: 'Kai Landers', total: '$920.00', paymentStatus: <Badge progress="complete">Paid</Badge>, fulfillmentStatus: <Badge progress="complete">Fulfilled</Badge> },
      // Add more items as needed
    ];
  
    const resourceName = { singular: 'order', plural: 'orders' };
    const { selectedResources, allResourcesSelected, handleSelectionChange } = useIndexResourceState(orders);
  
    const [currentPage, setCurrentPage] = useState(0);
    const itemsPerPage = 5;
    const totalPages = Math.ceil(orders.length / itemsPerPage);
  
    const paginatedOrders = orders.slice(
      currentPage * itemsPerPage,
      (currentPage + 1) * itemsPerPage
    );
  
    const rowMarkup = paginatedOrders.map(
      ({ id, order, date, customer, total, paymentStatus, fulfillmentStatus }, index) => (
        <IndexTable.Row
          id={id}
          key={id}
          selected={selectedResources.includes(id)}
          position={index}
        >
          <IndexTable.Cell>
            <Text variant="bodyMd" fontWeight="bold" as="span">{order}</Text>
          </IndexTable.Cell>
          <IndexTable.Cell>{date}</IndexTable.Cell>
          <IndexTable.Cell>{customer}</IndexTable.Cell>
          <IndexTable.Cell>
            <Text as="span" alignment="end" numeric>{total}</Text>
          </IndexTable.Cell>
          <IndexTable.Cell>{paymentStatus}</IndexTable.Cell>
          <IndexTable.Cell>{fulfillmentStatus}</IndexTable.Cell>
        </IndexTable.Row>
      )
    );
  
    const handleNextPage = () => {
      if (currentPage < totalPages - 1) {
        setCurrentPage(currentPage + 1);
      }
    };
  
    const handlePreviousPage = () => {
      if (currentPage > 0) {
        setCurrentPage(currentPage - 1);
      }
    };
  
    return (
      <LegacyCard>
        <IndexTable
          resourceName={resourceName}
          itemCount={orders.length}
          selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
          onSelectionChange={handleSelectionChange}
          headings={[
            { title: 'Order' },
            { title: 'Date' },
            { title: 'Customer' },
            { title: 'Total', alignment: 'end' },
            { title: 'Payment status' },
            { title: 'Fulfillment status' },
          ]}
          pagination={{
            hasNext: currentPage < totalPages - 1,
            hasPrevious: currentPage > 0,
            onNext: handleNextPage,
            onPrevious: handlePreviousPage,
          }}
        >
          {rowMarkup}
        </IndexTable>
      </LegacyCard>
    );
  }
  