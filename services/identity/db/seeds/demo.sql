INSERT INTO ident_users (id, handle, display_name)
VALUES
  ('usr_demo_alana', 'alana', 'Alana Pierce'),
  ('usr_demo_omar', 'omar', 'Omar Reed')
ON DUPLICATE KEY UPDATE
  handle = VALUES(handle),
  display_name = VALUES(display_name);

INSERT INTO ident_credentials (id, user_id, provider, password_hash)
VALUES
  (
    'cred_demo_alana_password',
    'usr_demo_alana',
    'password',
    'scrypt$c19e5720ff83ee7c8ec225c0818d188c$82abe6dc7722695d2c84a9918d5eff1ed61851d1367820d278020a8cdb8673f15a3f8b832924c3b66464d9bba972d805723da5b41db7367b2df236cec35d475c'
  ),
  (
    'cred_demo_omar_password',
    'usr_demo_omar',
    'password',
    'scrypt$97252eea4cb7cc37ed872f8984b671f0$57307a86e11e9c192fa8562e8d176c6eb15c02836151566e0ba8017935bf71f79697d0a028be31e11044c52ad43eeb4b15ffa09ff42efb88c018a06cd37d1d30'
  )
ON DUPLICATE KEY UPDATE
  user_id = VALUES(user_id),
  provider = VALUES(provider),
  password_hash = VALUES(password_hash);
