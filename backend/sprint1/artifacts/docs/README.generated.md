# git_clone_hwf81j48

## Auto-Generated Documentation

This documentation was automatically generated from the impact report and code changes.

This documentation summarizes the analyzed code changes and their impact. It provides repository metadata, a structured change inventory, and an impact summary to support review and release decisions.

**Generated:** 1970-01-01T00:00:00Z

---

## Repository Information

| Attribute | Value |
|-----------|-------|
| **Repository** | `git_clone_hwf81j48` |
| **Branch** | `main` |
| **Commit** | `8cf84334` |
| **Author** | `kireeti-ai` |
| **Severity** | `MAJOR` |
| **Breaking Changes** | Yes |

---

## Changed Files

**Total Files Changed:** 309

### By Language

- **Javascript**: 123 file(s)
- **Other/Unknown**: 186 file(s)

### File List

1. `LICENSE`
2. `README.md`
3. `SECURITY_DOCUMENTATION.md`
4. `SnapDish.pdf`
5. `logo-snapdish.png`
6. `readme.txt`
7. `Back/.env.example`
8. `Back/package.json`
9. `Back/server.js`
10. `DeliveryAgent/.env.production`
11. `DeliveryAgent/.svc`
12. `DeliveryAgent/README.md`
13. `DeliveryAgent/eslint.config.js`
14. `DeliveryAgent/index.html`
15. `DeliveryAgent/package.json`
16. `DeliveryAgent/vite.config.js`
17. `Food/README.md`
18. `Food/eslint.config.js`
19. `Food/header.jpeg`
20. `Food/index.html`
21. `Food/package.json`
22. `Food/table-2.jpg`
23. `Food/table.jpg`
24. `Food/vite.config.js`
25. `admin/README.md`
26. `admin/eslint.config.js`
27. `admin/index.html`
28. `admin/package.json`
29. `admin/vite.config.js`
30. `restaurant-admin/.env.production`
31. `restaurant-admin/README.md`
32. `restaurant-admin/eslint.config.js`
33. `restaurant-admin/index.html`
34. `restaurant-admin/package.json`
35. `restaurant-admin/vite.config.js`
36. `Back/config/cloudinary.js`
37. `Back/config/db.js`
38. `Back/controllers/addressController.js`
39. `Back/controllers/adminController.js`
40. `Back/controllers/creatorApplicationController.js`
41. `Back/controllers/deliveryController.js`
42. `Back/controllers/menuItemController.js`
43. `Back/controllers/orderController.js`
44. `Back/controllers/restaurantController.js`
45. `Back/controllers/restaurantDashboardController.js`
46. `Back/controllers/userController.js`
47. `Back/middleware/authMiddleware.js`
48. `Back/middleware/csrfMiddleware.js`
49. `Back/middleware/serverMiddleware.js`
50. `Back/middleware/uploadMiddleware.js`
51. `Back/models/addressModel.js`
52. `Back/models/creatorApplicationModel.js`
53. `Back/models/menuItemModel.js`
54. `Back/models/orderModel.js`
55. `Back/models/restaurantModel.js`
56. `Back/models/settingsModel.js`
57. `Back/models/userModel.js`
58. `Back/routes/addressRoutes.js`
59. `Back/routes/adminRoutes.js`
60. `Back/routes/creatorApplicationRoutes.js`
61. `Back/routes/dashboardRoutes.js`
62. `Back/routes/deliveryRoute.js`
63. `Back/routes/menuItemRoutes.js`
64. `Back/routes/orderRoute.js`
65. `Back/routes/restaurantDashboardRoutes.js`
66. `Back/routes/restaurantRoutes.js`
67. `Back/routes/userRoutes.js`
68. `Back/utils/cloudinary.js`
69. `Back/utils/security.js`
70. `Back/utils/sendEmail.js`
71. `DeliveryAgent/public/vite.svg`
72. `DeliveryAgent/src/App.css`
73. `DeliveryAgent/src/App.jsx`
74. `DeliveryAgent/src/index.css`
75. `DeliveryAgent/src/main.jsx`
76. `Food/src/App.css`
77. `Food/src/App.jsx`
78. `Food/src/index.css`
79. `Food/src/main.jsx`
80. `admin/public/vite.svg`
81. `admin/src/App.css`
82. `admin/src/App.jsx`
83. `admin/src/index.css`
84. `admin/src/main.jsx`
85. `restaurant-admin/src/App.css`
86. `restaurant-admin/src/App.jsx`
87. `restaurant-admin/src/index.css`
88. `restaurant-admin/src/main.jsx`
89. `restaurant-admin/src/tailwind.config.js`
90. `Back/uploads/avatars/1758173712276.jpeg`
91. `Back/uploads/avatars/1758173848085.jpg`
92. `Back/uploads/avatars/1758173866712.png`
93. `Back/uploads/avatars/1758173963597.jpeg`
94. `Back/uploads/avatars/1758180630468.jpg`
95. `Back/uploads/avatars/1758195554100.jpg`
96. `Back/uploads/avatars/1758197945761.png`
97. `Back/uploads/avatars/1758215370241_agent-2.png`
98. `Back/uploads/foods/1758194130922_agent.png`
99. `Back/uploads/foods/1758194140361_agent.png`
100. `Back/uploads/foods/1758194837608_agent.png`
101. `Back/uploads/foods/1758195092708_FileUploadServlet.jpeg`
102. `Back/uploads/foods/1758197972239_agent-2.png`
103. `DeliveryAgent/src/components/ActiveOrder.css`
104. `DeliveryAgent/src/components/ActiveOrder.jsx`
105. `DeliveryAgent/src/components/BottomNav.css`
106. `DeliveryAgent/src/components/BottomNav.jsx`
107. `DeliveryAgent/src/components/Header.css`
108. `DeliveryAgent/src/components/Header.jsx`
109. `DeliveryAgent/src/components/Layout.jsx`
110. `DeliveryAgent/src/components/OrderNotification.css`
111. `DeliveryAgent/src/components/OrderNotification.jsx`
112. `DeliveryAgent/src/context/AuthContext.jsx`
113. `DeliveryAgent/src/context/OrderContext.jsx`
114. `DeliveryAgent/src/pages/DashboardPage.css`
115. `DeliveryAgent/src/pages/DashboardPage.jsx`
116. `DeliveryAgent/src/pages/EarningsPage.css`
117. `DeliveryAgent/src/pages/EarningsPage.jsx`
118. `DeliveryAgent/src/pages/LoginPage.css`
119. `DeliveryAgent/src/pages/LoginPage.jsx`
120. `DeliveryAgent/src/pages/OrderHistoryPage.css`
121. `DeliveryAgent/src/pages/OrderHistoryPage.jsx`
122. `DeliveryAgent/src/pages/ProfilePage.css`
123. `DeliveryAgent/src/pages/ProfilePage.jsx`
124. `DeliveryAgent/src/pages/SSOHandler.jsx`
125. `Food/src/Context/StoreContext.jsx`
126. `Food/src/assets/add_icon_green.png`
127. `Food/src/assets/add_icon_white.png`
128. `Food/src/assets/agent-2.png`
129. `Food/src/assets/app_store.png`
130. `Food/src/assets/assets.js`
131. `Food/src/assets/bag_icon.png`
132. `Food/src/assets/basket_icon.svg`
133. `Food/src/assets/biryani.png.avif`
134. `Food/src/assets/burger-2.png`
135. `Food/src/assets/burger.png`
136. `Food/src/assets/checked.png`
137. `Food/src/assets/chicken.png.avif`
138. `Food/src/assets/cross_icon.png`
139. `Food/src/assets/facebook_icon.png`
140. `Food/src/assets/food_1.png`
141. `Food/src/assets/food_10.png`
142. `Food/src/assets/food_11.png`
143. `Food/src/assets/food_12.png`
144. `Food/src/assets/food_13.png`
145. `Food/src/assets/food_14.png`
146. `Food/src/assets/food_15.png`
147. `Food/src/assets/food_16.png`
148. `Food/src/assets/food_17.png`
149. `Food/src/assets/food_18.png`
150. `Food/src/assets/food_19.png`
151. `Food/src/assets/food_2.png`
152. `Food/src/assets/food_20.png`
153. `Food/src/assets/food_21.png`
154. `Food/src/assets/food_22.png`
155. `Food/src/assets/food_23.png`
156. `Food/src/assets/food_24.png`
157. `Food/src/assets/food_25.png`
158. `Food/src/assets/food_26.png`
159. `Food/src/assets/food_27.png`
160. `Food/src/assets/food_28.png`
161. `Food/src/assets/food_29.png`
162. `Food/src/assets/food_3.png`
163. `Food/src/assets/food_30.png`
164. `Food/src/assets/food_31.png`
165. `Food/src/assets/food_32.png`
166. `Food/src/assets/food_4.png`
167. `Food/src/assets/food_5.png`
168. `Food/src/assets/food_6.png`
169. `Food/src/assets/food_7.png`
170. `Food/src/assets/food_8.png`
171. `Food/src/assets/food_9.png`
172. `Food/src/assets/fried rice.png.avif`
173. `Food/src/assets/header.jpeg`
174. `Food/src/assets/header_img.png`
175. `Food/src/assets/heart_outline.png`
176. `Food/src/assets/heart_solid.png`
177. `Food/src/assets/hourglass.png`
178. `Food/src/assets/linkedin_icon.png`
179. `Food/src/assets/loading-bar.png`
180. `Food/src/assets/logo-snapdish.png`
181. `Food/src/assets/logo.svg`
182. `Food/src/assets/logout_icon.png`
183. `Food/src/assets/magnifying-glass.png`
184. `Food/src/assets/map.png`
185. `Food/src/assets/menu_1.png`
186. `Food/src/assets/menu_2.png`
187. `Food/src/assets/menu_3.png`
188. `Food/src/assets/menu_4.png`
189. `Food/src/assets/menu_5.png`
190. `Food/src/assets/menu_6.png`
191. `Food/src/assets/menu_7.png`
192. `Food/src/assets/menu_8.png`
193. `Food/src/assets/offer.png`
194. `Food/src/assets/paratha.png.avif`
195. `Food/src/assets/parcel_icon.png`
196. `Food/src/assets/parota.jpg.avif`
197. `Food/src/assets/pin.png`
198. `Food/src/assets/pizza.png.avif`
199. `Food/src/assets/play_store.png`
200. `Food/src/assets/profile_icon.png`
201. `Food/src/assets/rating_starts.png`
202. `Food/src/assets/react.svg`
203. `Food/src/assets/remove.png`
204. `Food/src/assets/remove_icon_red.png`
205. `Food/src/assets/restaurant.png`
206. `Food/src/assets/review.png`
207. `Food/src/assets/save-1.png`
208. `Food/src/assets/save.png`
209. `Food/src/assets/search_icon.png`
210. `Food/src/assets/selector_icon.png`
211. `Food/src/assets/star.png`
212. `Food/src/assets/trash-can.png`
213. `Food/src/assets/twitter_icon.png`
214. `Food/src/assets/un_checked.png`
215. `Food/src/assets/user.png`
216. `admin/src/assets/add_icon.png`
217. `admin/src/assets/assets.js`
218. `admin/src/assets/booking.png`
219. `admin/src/assets/logo-snapdish.png`
220. `admin/src/assets/logo.png`
221. `admin/src/assets/order_icon.png`
222. `admin/src/assets/plus.png`
223. `admin/src/assets/profile_image.png`
224. `admin/src/assets/react.svg`
225. `admin/src/assets/search.png`
226. `admin/src/assets/user.png`
227. `admin/src/components/Dashboard.css`
228. `admin/src/components/Dashboard.jsx`
229. `admin/src/components/ErrorBoundary.css`
230. `admin/src/components/ErrorBoundary.jsx`
231. `admin/src/components/LoginPage.jsx`
232. `admin/src/components/ManageCreators.css`
233. `admin/src/components/ManageCreators.jsx`
234. `admin/src/components/ManageCustomers.jsx`
235. `admin/src/components/ManageDeliveryPartners.jsx`
236. `admin/src/components/ManageRestaurants.jsx`
237. `admin/src/components/ManageUsers.jsx`
238. `admin/src/components/Settings.jsx`
239. `admin/src/components/Sidebar.jsx`
240. `admin/src/components/ViewOrders.jsx`
241. `restaurant-admin/src/components/ChartCard.jsx`
242. `restaurant-admin/src/components/DataTable.jsx`
243. `restaurant-admin/src/components/Navbar.jsx`
244. `restaurant-admin/src/components/RevenueOrdersChart.jsx`
245. `restaurant-admin/src/components/Sidebar.jsx`
246. `restaurant-admin/src/components/StatsCard.jsx`
247. `restaurant-admin/src/context/AuthContext.jsx`
248. `restaurant-admin/src/pages/Dashboard.jsx`
249. `restaurant-admin/src/pages/Login.jsx`
250. `restaurant-admin/src/pages/Menu.jsx`
251. `restaurant-admin/src/pages/Orders.jsx`
252. `restaurant-admin/src/pages/Reports.jsx`
253. `restaurant-admin/src/pages/Restaurants.jsx`
254. `restaurant-admin/src/pages/SSOHandler.jsx`
255. `restaurant-admin/src/pages/Settings.jsx`
256. `restaurant-admin/src/pages/Users.jsx`
257. `restaurant-admin/src/utils/api.js`
258. `Food/src/components/Addresses/Address.css`
259. `Food/src/components/Addresses/Address.jsx`
260. `Food/src/components/Addresses/AddressManager.css`
261. `Food/src/components/Addresses/AddressManager.jsx`
262. `Food/src/components/FoodItem/FoodItem.css`
263. `Food/src/components/FoodItem/FoodItem.jsx`
264. `Food/src/components/Footer/Footer.css`
265. `Food/src/components/Footer/Footer.jsx`
266. `Food/src/components/Header/Header.css`
267. `Food/src/components/Header/Header.jsx`
268. `Food/src/components/LocationModel/LocationModel.css`
269. `Food/src/components/LocationModel/LocationModel.jsx`
270. `Food/src/components/LoginPopup/LoginPopup.css`
271. `Food/src/components/LoginPopup/LoginPopup.jsx`
272. `Food/src/components/MyReviews/MyReviews.css`
273. `Food/src/components/MyReviews/MyReviews.jsx`
274. `Food/src/components/OrderStatusTracker/OrderStatusTracker.css`
275. `Food/src/components/OrderStatusTracker/OrderStatusTracker.jsx`
276. `Food/src/components/RestaurantChangePrompt/RestaurantChangePrompt.css`
277. `Food/src/components/RestaurantChangePrompt/RestaurantChangePrompt.jsx`
278. `Food/src/components/RestaurantDisplay/RestaurantDisplay.css`
279. `Food/src/components/RestaurantDisplay/RestaurantDisplay.jsx`
280. `Food/src/components/RestaurantItem/RestaurantItem.css`
281. `Food/src/components/RestaurantItem/RestaurantItem.jsx`
282. `Food/src/components/Reviews/Reviews.css`
283. `Food/src/components/Reviews/Reviews.jsx`
284. `Food/src/components/navbar/navbar.css`
285. `Food/src/components/navbar/navbar.jsx`
286. `Food/src/pages/Affiliate/CreatorCommunity.css`
287. `Food/src/pages/Affiliate/CreatorCommunity.jsx`
288. `Food/src/pages/ManageResturant/ManageRestaurant.css`
289. `Food/src/pages/ManageResturant/ManageResturant.jsx`
290. `Food/src/pages/MyOrders/MyOrders.css`
291. `Food/src/pages/MyOrders/MyOrders.jsx`
292. `Food/src/pages/MyReviews/MyReviews.css`
293. `Food/src/pages/MyReviews/MyReviews.jsx`
294. `Food/src/pages/OrderSuccess/OrderSuccess.css`
295. `Food/src/pages/OrderSuccess/OrderSuccess.jsx`
296. `Food/src/pages/RestaurantDetail/RestaurantDetail.css`
297. `Food/src/pages/RestaurantDetail/RestaurantDetail.jsx`
298. `Food/src/pages/SearchPage/SearchPage.css`
299. `Food/src/pages/SearchPage/SearchPage.jsx`
300. `Food/src/pages/WishList/WishList.css`
301. `Food/src/pages/WishList/WishList.jsx`
302. `Food/src/pages/cart/Cart.jsx`
303. `Food/src/pages/cart/cart.css`
304. `Food/src/pages/home/Home.css`
305. `Food/src/pages/home/Home.jsx`
306. `Food/src/pages/placeOrder/PlaceOrder.jsx`
307. `Food/src/pages/placeOrder/placeOrder.css`
308. `Food/src/pages/profile/profile.css`
309. `Food/src/pages/profile/profile.jsx`

---

## Change Impact

**Severity Level:** `MAJOR`

**MAJOR** - Important changes that may affect multiple components.

**Breaking Changes:** Yes - Review carefully before deployment

Impact level is MAJOR. Breaking changes: Yes. Review high-risk files before deployment.

---

## Additional Documentation

- [API Reference](api/api-reference.md)
- [Architecture Decision Records](adr/ADR-001.md)
- [System Diagrams](architecture/)

---

## Installation

Not detected in the impact report.

## Usage

Not detected in the impact report.

## Features

Not detected in the impact report.

## Tech Stack

Not detected in the impact report.

## Configuration

Not detected in the impact report.

## Troubleshooting

Not detected in the impact report.

## Contributing

Not detected in the impact report.

## License

Not detected in the impact report.

---

## About This Document

This README was automatically generated by the EPIC-2 documentation pipeline based on the impact report.

For more information about the documentation system, see the [documentation snapshot](doc_snapshot.json).
