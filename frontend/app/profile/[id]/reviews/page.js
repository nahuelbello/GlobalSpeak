"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import ProfileLayout from "../../../components/ProfileLayout";

function ReviewCard({ review }) {
  return (
    <div className="border p-4 rounded">
      <strong>{review.student_name}</strong> – {review.rating}/5
      <p>{review.text}</p>
    </div>
  );
}

export default function ReviewsPage() {
  const { id } = useParams();
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    fetch(`/api/reviews?teacherId=${id}`)
      .then((res) => res.json())
      .then((data) => setReviews(data.reviews))
      .catch(console.error);
  }, [id]);

  return (
    <ProfileLayout userId={id}>
      <main className="p-4 space-y-4">
        {reviews.length === 0 ? (
          <p>No hay reseñas.</p>
        ) : (
          reviews.map((r) => <ReviewCard key={r.id} review={r} />)
        )}
      </main>
    </ProfileLayout>
  );
}