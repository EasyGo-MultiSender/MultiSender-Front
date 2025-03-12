import { TransactionResultItem } from './TransactionResultItem';

const Serializer = () => {
  return (
    <>
      <List>
        {transactionResults.map((result, index) => (
          <TransactionResultItem
            key={`${result.signature}-${index}`}
            result={result}
            connection={connection}
            recipientAddresses={parsedEntries}
          />
        ))}
      </List>
    </>
  );
};

export default Serializer;
