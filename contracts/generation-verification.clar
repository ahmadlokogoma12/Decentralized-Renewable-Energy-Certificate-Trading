;; Generation Verification Contract
;; This contract validates clean energy production

(define-data-var admin principal tx-sender)

;; Map to store energy generators
(define-map generators principal
  {
    name: (string-utf8 100),
    location: (string-utf8 100),
    capacity: uint,
    verified: bool
  }
)

;; Map to store energy generation records
(define-map generation-records uint
  {
    generator: principal,
    amount: uint,
    timestamp: uint,
    verified: bool
  }
)

(define-data-var record-counter uint u0)

;; Register a new energy generator
(define-public (register-generator (name (string-utf8 100)) (location (string-utf8 100)) (capacity uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (ok (map-set generators tx-sender {
      name: name,
      location: location,
      capacity: capacity,
      verified: false
    }))
  )
)

;; Verify a generator
(define-public (verify-generator (generator-address principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (match (map-get? generators generator-address)
      generator (ok (map-set generators generator-address
        (merge generator { verified: true })))
      (err u404)
    )
  )
)

;; Record energy generation
(define-public (record-generation (amount uint))
  (let ((generator-info (map-get? generators tx-sender)))
    (asserts! (is-some generator-info) (err u404))
    (asserts! (get verified (unwrap! generator-info (err u404))) (err u403))
    (let ((record-id (+ (var-get record-counter) u1)))
      (var-set record-counter record-id)
      (ok (map-set generation-records record-id {
        generator: tx-sender,
        amount: amount,
        timestamp: block-height,
        verified: false
      }))
    )
  )
)

;; Verify energy generation record
(define-public (verify-generation (record-id uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (match (map-get? generation-records record-id)
      record (ok (map-set generation-records record-id
        (merge record { verified: true })))
      (err u404)
    )
  )
)

;; Get generation record
(define-read-only (get-generation-record (record-id uint))
  (map-get? generation-records record-id)
)

;; Get generator info
(define-read-only (get-generator-info (generator-address principal))
  (map-get? generators generator-address)
)

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (ok (var-set admin new-admin))
  )
)
