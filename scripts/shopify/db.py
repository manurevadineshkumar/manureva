import pymysql
import paramiko
import pandas as pd
from paramiko import SSHClient
from sshtunnel import SSHTunnelForwarder
from os.path import expanduser
import os

home = expanduser('~')
mypkey = paramiko.RSAKey.from_private_key_file(home + '/.ssh/id_rsa')

ssh_host = os.environ['KORVIN_SSH_HOST']
ssh_port = 22
ssh_user = os.environ['KORVIN_SSH_USER']

sql_user = os.environ['KORVIN_DB_USER']
sql_password = os.environ['KORVIN_DB_PASSWORD']
sql_database = os.environ['KORVIN_DB_DATABASE']


def run_sql_query(query):
    with SSHTunnelForwarder(
        (ssh_host, ssh_port),
        ssh_username=ssh_user,
        ssh_pkey=mypkey,
        remote_bind_address=('localhost', 3306)
    ) as tunnel:
        conn = pymysql.connect(host='localhost', user=sql_user,
            passwd=sql_password, db=sql_database,
            port=tunnel.local_bind_port)
        data = pd.read_sql_query(query, conn)
        conn.close()
    return data
