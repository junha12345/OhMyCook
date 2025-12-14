import React, { useEffect, useMemo, useState } from 'react';
import MainHeader from './MainHeader';
import ImageWithFallback from './ImageWithFallback';
import { useLanguage } from '../context/LanguageContext';
import { CommunityPost, Recipe, User } from '../types';
import { HeartIcon, MessageCircleIcon, SendIcon, UsersIcon, XIcon } from './icons';

interface CommunityProps {
  currentUser: User | null;
  currentUserProfileImage?: string;
  savedRecipes: Recipe[];
  posts: CommunityPost[];
  onCreatePost: (recipe: Recipe, note?: string) => void;
  onToggleLike: (postId: string) => void;
  onAddComment: (postId: string, content: string) => void;
  onDeletePost: (postId: string) => void;
}

const Community: React.FC<CommunityProps> = ({
  currentUser,
  currentUserProfileImage,
  savedRecipes,
  posts,
  onCreatePost,
  onToggleLike,
  onAddComment,
  onDeletePost
}) => {
  const { t } = useLanguage();
  const [selectedRecipeName, setSelectedRecipeName] = useState<string>(savedRecipes[0]?.recipeName || '');
  const [note, setNote] = useState('');
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  useEffect(() => {
    if (savedRecipes.length > 0 && !selectedRecipeName) {
      setSelectedRecipeName(savedRecipes[0].recipeName);
    }
  }, [savedRecipes, selectedRecipeName]);

  const sortedPosts = useMemo(
    () => [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [posts]
  );

  const getImageUrl = (recipe: Recipe, size: number) => {
    if (recipe.imageUrl) return recipe.imageUrl;

    const query = (recipe.imageSearchQuery || recipe.englishRecipeName || recipe.recipeName)
      .trim()
      .replace(/\s+/g, ',');

    return `https://source.unsplash.com/${size}x${size}/?${query},food`;
  };

  const handleShare = () => {
    if (!selectedRecipeName) return;
    const recipe = savedRecipes.find((r) => r.recipeName === selectedRecipeName);
    if (!recipe) return;
    onCreatePost(recipe, note.trim() || undefined);
    setNote('');
  };

  const handleSubmitComment = (postId: string) => {
    const content = (commentInputs[postId] || '').trim();
    if (!content) return;
    onAddComment(postId, content);
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const renderAvatar = (
    options: {
      imageUrl?: string;
      fallbackText: string;
      size?: string;
    }
  ) => {
    const { imageUrl, fallbackText, size = 'w-10 h-10' } = options;
    if (imageUrl) {
      return <img src={imageUrl} alt={fallbackText} className={`${size} rounded-full object-cover border border-line-light`} />;
    }
    return (
      <div
        className={`${size} rounded-full bg-brand-primary/10 text-brand-dark flex items-center justify-center font-semibold`}
      >
        {fallbackText}
      </div>
    );
  };

  const renderRecipeDetails = (recipe: Recipe) => {
    return (
      <div className="mt-3 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
          <span className="font-semibold text-text-primary">{t('cookTime')}:</span>
          <span>{recipe.cookTime} min</span>
          <span className="font-semibold text-text-primary">{t('servings')}:</span>
          <span>{recipe.servings}</span>
          <span className="font-semibold text-text-primary">{t('difficulty')}:</span>
          <span>{recipe.difficulty}</span>
          <span className="font-semibold text-text-primary">{t('spiciness')}:</span>
          <span>{recipe.spiciness}</span>
        </div>

        <div>
          <p className="font-semibold text-text-primary mb-1">{t('ingredients')}</p>
          <ul className="list-disc list-inside text-sm text-text-secondary space-y-1">
            {recipe.ingredients.map((item, index) => (
              <li key={`${recipe.recipeName}-ingredient-${index}`}>{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-semibold text-text-primary mb-1">{t('instructions')}</p>
          {recipe.instructions.length > 0 ? (
            <ol className="list-decimal list-inside text-sm text-text-secondary space-y-1">
              {recipe.instructions.map((step, index) => (
                <li key={`${recipe.recipeName}-instruction-${index}`}>{step}</li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-text-secondary">{t('noInstructions')}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <MainHeader />

      <div className="p-4 pb-24 overflow-y-auto">
        <div className="bg-surface p-4 rounded-2xl border border-line-light shadow-subtle mb-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-dark flex items-center justify-center font-bold text-lg">
                <UsersIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-lg text-text-primary">{t('communityTitle')}</p>
                <p className="text-sm text-text-secondary">{t('communitySubtitle')}</p>
              </div>
            </div>
            <button
              onClick={() => setIsComposerOpen((prev) => !prev)}
              className="h-10 px-4 rounded-lg bg-brand-primary text-white text-sm font-semibold shadow-subtle hover:shadow-md transition"
            >
              {isComposerOpen ? t('closeComposer') : t('writePost')}
            </button>
          </div>

          {isComposerOpen && (
            <div className="bg-brand-primary/5 p-3 rounded-xl">
              <p className="text-sm font-semibold text-text-primary mb-2">{t('shareSavedRecipe')}</p>
              {savedRecipes.length === 0 ? (
                <p className="text-sm text-text-secondary">{t('shareRequiresSaved')}</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {renderAvatar({
                      imageUrl: currentUserProfileImage,
                      fallbackText: currentUser?.email?.[0]?.toUpperCase() || '?',
                    })}
                    <div className="flex-1">
                      <label className="text-xs text-text-secondary block mb-1">{t('selectRecipeToShare')}</label>
                      <select
                        value={selectedRecipeName}
                        onChange={(e) => setSelectedRecipeName(e.target.value)}
                        className="w-full bg-white border border-line-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      >
                        {savedRecipes.map((recipe) => (
                          <option key={recipe.recipeName} value={recipe.recipeName}>
                            {recipe.recipeName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t('communityNotePlaceholder') || ''}
                    className="w-full bg-white border border-line-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    rows={3}
                  />
                  <button
                    onClick={handleShare}
                    className="w-full bg-brand-primary text-white font-semibold py-2 rounded-lg shadow-subtle hover:shadow-md transition"
                  >
                    {t('postToCommunity')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {sortedPosts.length === 0 ? (
          <div className="bg-surface p-4 rounded-2xl border border-line-light shadow-subtle text-center text-text-secondary">
            {t('communityEmpty')}
          </div>
        ) : (
          <div className="space-y-4">
            {sortedPosts.map((post) => {
              const hasLiked = currentUser && currentUser.id ? post.likes.includes(currentUser.id) : false;
              const commentValue = commentInputs[post.id] || '';
              const isExpanded = expandedPostId === post.id;
              return (
                <div key={post.id} className="bg-surface p-4 rounded-2xl border border-line-light shadow-subtle">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setExpandedPostId((prev) => (prev === post.id ? null : post.id))}
                      className="flex items-center gap-3 text-left focus:outline-none"
                    >
                      {renderAvatar({
                        imageUrl: post.authorProfileImage,
                        fallbackText: post.authorName?.[0]?.toUpperCase() || post.authorEmail[0].toUpperCase(),
                      })}
                      <div>
                        <p className="font-semibold text-text-primary">{post.authorName || post.authorEmail}</p>
                        <p className="text-xs text-text-secondary">{formatDate(post.createdAt)}</p>
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        currentUser && onToggleLike(post.id);
                      }}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full border ${hasLiked ? 'bg-brand-primary text-white border-brand-primary' : 'border-line-light text-text-secondary'}`}
                    >
                      <HeartIcon className={`w-4 h-4 ${hasLiked ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  <button
                    onClick={() => setExpandedPostId((prev) => (prev === post.id ? null : post.id))}
                    className="w-full text-left mt-4 flex gap-3 focus:outline-none"
                  >
                    <ImageWithFallback
                      src={getImageUrl(post.recipe, 200)}
                      alt={post.recipe.recipeName}
                      className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                    />
                    <div className="flex-1">
                      <p className="font-bold text-lg text-text-primary flex items-center gap-2">
                        {post.recipe.recipeName}
                        <span className="text-xs font-semibold text-text-secondary bg-brand-primary/10 px-2 py-1 rounded-full">
                          {post.comments.length} {t('comments')}
                        </span>
                      </p>
                      <p className={`text-sm text-text-secondary ${isExpanded ? '' : 'line-clamp-2'}`}>{post.recipe.description}</p>
                      {post.note && <p className="text-sm text-text-primary mt-2">“{post.note}”</p>}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-4">
                      {renderRecipeDetails(post.recipe)}

                      <div className="mt-4">
                        <div className="flex items-center gap-2 text-sm text-text-secondary font-semibold">
                          <MessageCircleIcon className="w-4 h-4" />
                          <span>
                            {t('comments')} ({post.comments.length})
                          </span>
                        </div>
                        <div className="space-y-2 mt-2">
                          {post.comments.map((comment) => (
                            <div key={comment.id} className="bg-brand-primary/5 p-2 rounded-lg flex gap-2 items-start">
                              {renderAvatar({
                                imageUrl: comment.authorProfileImage,
                                fallbackText: comment.authorName?.[0]?.toUpperCase() || comment.authorEmail[0].toUpperCase(),
                                size: 'w-8 h-8',
                              })}
                              <div>
                                <p className="text-sm font-semibold text-text-primary">{comment.authorName || comment.authorEmail}</p>
                                <p className="text-sm text-text-secondary">{comment.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        {currentUser && (
                          <div className="flex items-center gap-2 mt-3">
                            <input
                              value={commentValue}
                              onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                              placeholder={t('commentPlaceholder') || ''}
                              className="flex-1 bg-white border border-line-light rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            />
                            <button
                              onClick={() => handleSubmitComment(post.id)}
                              className="p-2 rounded-full bg-brand-primary text-white shadow-subtle hover:shadow-md"
                            >
                              <SendIcon className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                      
                      {currentUser && currentUser.id === post.authorId && (
                    <div className="flex justify-end mt-4 pt-4 border-t border-line-light">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(t('confirmDeletePost') || "Delete this post?")) {
                            onDeletePost(post.id);
                          }
                        }}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1"
                      >
                        <XIcon className="w-4 h-4" />
                        <span>{t('deletePost') || "Delete Post"}</span>
                      </button>
                    </div>
                  )}
                </div>
              )
            }
                </div>
        );
            })}
      </div>
        )}
    </div>
    </div >
  );
};

export default Community;
