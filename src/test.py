from cassandra.cluster import Cluster

if __name__ == "__main__":
    cluster = Cluster(['localhost'])
    session = cluster.connect('finance_ledger')
    session.execute("SELECT * FROM transactions")
    cluster.shutdown()

    